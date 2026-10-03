import type { DesignGraph, DrillScore, ItemScore } from "@repo/design";
import { and, count, desc, eq, gte, isNotNull, ne, sql } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import { problemsSchema, type SubmissionRow, submissionsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import {
  type BestScore,
  type CompleteReviewData,
  type CreateSubmissionData,
  type ReviewableSubmission,
  type SharedSolution,
  SubmissionsRepository,
} from "../ports/submissions.repository";
import type { DesignReview, SubmissionEntity } from "../submission.entity";

const NEWEST_FIRST = new Keyset<SubmissionEntity>({
  sort: submissionsSchema.createdAt,
  id: submissionsSchema.id,
  direction: "desc",
  key: (submission) => [submission.createdAt, submission.id],
});

const toEntity = ({
  graph: _graph,
  reviewModel: _model,
  reviewPromptVersion: _version,
  ...row
}: SubmissionRow): SubmissionEntity => ({
  ...row,
  review: row.review as DesignReview | null,
  items: row.items as ItemScore[],
  drills: row.drills as DrillScore[],
});

export class PostgresSubmissionsRepository extends SubmissionsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: CreateSubmissionData): Promise<SubmissionEntity> {
    const [row] = await this.db
      .insert(submissionsSchema)
      .values(data)
      .returning();

    return toEntity(row!);
  }

  public async findById(id: string): Promise<ReviewableSubmission | null> {
    const [row] = await this.db
      .select()
      .from(submissionsSchema)
      .where(eq(submissionsSchema.id, id))
      .limit(1);

    return row
      ? { submission: toEntity(row), graph: row.graph as DesignGraph | null }
      : null;
  }

  public async completeReview(
    id: string,
    data: CompleteReviewData,
  ): Promise<SubmissionEntity | null> {
    const [row] = await this.db
      .update(submissionsSchema)
      .set({ ...data, reviewStatus: "reviewed" })
      .where(
        and(
          eq(submissionsSchema.id, id),
          eq(submissionsSchema.reviewStatus, "pending"),
        ),
      )
      .returning();

    return row ? toEntity(row) : null;
  }

  public async failReview(id: string): Promise<void> {
    await this.db
      .update(submissionsSchema)
      .set({ reviewStatus: "failed" })
      .where(
        and(
          eq(submissionsSchema.id, id),
          eq(submissionsSchema.reviewStatus, "pending"),
        ),
      );
  }

  public async list(
    userId: string,
    problemId: string,
    page: PageRequest,
  ): Promise<Page<SubmissionEntity>> {
    const rows = await this.db
      .select()
      .from(submissionsSchema)
      .where(
        and(
          eq(submissionsSchema.userId, userId),
          eq(submissionsSchema.problemId, problemId),
          NEWEST_FIRST.after(page.cursor),
        ),
      )
      .orderBy(...NEWEST_FIRST.orderBy())
      .limit(NEWEST_FIRST.limit(page));

    return NEWEST_FIRST.page(rows.map(toEntity), page);
  }

  public async bestOfficialScores(userId: string): Promise<BestScore[]> {
    const rows = await this.db
      .select({
        problemId: problemsSchema.id,
        slug: problemsSchema.slug,
        title: problemsSchema.title,
        difficulty: problemsSchema.difficulty,
        bestScore: sql<
          number | null
        >`max(${submissionsSchema.score}) filter (where ${submissionsSchema.counted})`,
        submissions: count(submissionsSchema.id),
      })
      .from(submissionsSchema)
      .innerJoin(
        problemsSchema,
        eq(problemsSchema.id, submissionsSchema.problemId),
      )
      .where(
        and(
          eq(submissionsSchema.userId, userId),
          eq(problemsSchema.source, "official"),
        ),
      )
      .groupBy(problemsSchema.id)
      .orderBy(problemsSchema.createdAt);

    return rows.map((row) => ({ ...row, bestScore: row.bestScore ?? 0 }));
  }

  public async listSolutions(
    problemId: string,
    exceptUserId: string,
    minScore: number,
    limit: number,
  ): Promise<SharedSolution[]> {
    const best = this.db
      .selectDistinctOn([submissionsSchema.userId], {
        score: submissionsSchema.score,
        problemVersion: submissionsSchema.problemVersion,
        graph: submissionsSchema.graph,
        createdAt: submissionsSchema.createdAt,
      })
      .from(submissionsSchema)
      .where(
        and(
          eq(submissionsSchema.problemId, problemId),
          ne(submissionsSchema.userId, exceptUserId),
          gte(submissionsSchema.score, minScore),
          isNotNull(submissionsSchema.graph),
        ),
      )
      .orderBy(
        submissionsSchema.userId,
        desc(submissionsSchema.score),
        desc(submissionsSchema.createdAt),
      )
      .as("best");

    const rows = await this.db
      .select()
      .from(best)
      .orderBy(desc(best.createdAt))
      .limit(limit);

    return rows.map((row) => ({ ...row, graph: row.graph as DesignGraph }));
  }
}
