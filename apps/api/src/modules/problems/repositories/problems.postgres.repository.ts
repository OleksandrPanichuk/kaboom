import { type ProblemContent, ProblemContentSchema } from "@repo/design";
import { and, asc, eq } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import {
  type ProblemRow,
  problemsSchema,
  type ProblemVersionRow,
  problemVersionsSchema,
} from "@/db";
import { type DBExecutor, getExecutor, transaction } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import {
  type OfficialProblemSync,
  type ProblemFilter,
  ProblemsRepository,
  type SyncOutcome,
} from "../ports/problems.repository";
import type {
  ProblemEntity,
  ProblemVersionEntity,
  ProblemWithContent,
} from "../problem.entity";

const OLDEST_FIRST = new Keyset<ProblemEntity>({
  sort: problemsSchema.createdAt,
  id: problemsSchema.id,
  key: (problem) => [problem.createdAt, problem.id],
});

const toProblem = (row: ProblemRow): ProblemEntity => ({ ...row });

const toVersion = (row: ProblemVersionRow): ProblemVersionEntity => ({
  ...row,
  content: ProblemContentSchema.parse(row.content),
});

const fields = (content: ProblemContent) => ({
  track: content.track,
  title: content.title,
  summary: content.summary,
  difficulty: content.difficulty,
  tags: content.tags,
});

export class PostgresProblemsRepository extends ProblemsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async listPublished(
    filter: ProblemFilter,
    page: PageRequest,
  ): Promise<Page<ProblemEntity>> {
    const rows = await this.db
      .select()
      .from(problemsSchema)
      .where(
        and(
          eq(problemsSchema.status, "published"),
          filter.track ? eq(problemsSchema.track, filter.track) : undefined,
          filter.difficulty
            ? eq(problemsSchema.difficulty, filter.difficulty)
            : undefined,
          OLDEST_FIRST.after(page.cursor),
        ),
      )
      .orderBy(...OLDEST_FIRST.orderBy())
      .limit(OLDEST_FIRST.limit(page));

    return OLDEST_FIRST.page(rows.map(toProblem), page);
  }

  public async listPublishedContent(): Promise<ProblemWithContent[]> {
    const rows = await this.db
      .select()
      .from(problemsSchema)
      .innerJoin(
        problemVersionsSchema,
        and(
          eq(problemVersionsSchema.problemId, problemsSchema.id),
          eq(problemVersionsSchema.version, problemsSchema.currentVersion),
        ),
      )
      .where(eq(problemsSchema.status, "published"))
      .orderBy(asc(problemsSchema.slug));

    return rows.map((row) => ({
      problem: toProblem(row.problems),
      version: toVersion(row.problem_versions),
    }));
  }

  public async findPublishedBySlug(
    slug: string,
  ): Promise<ProblemWithContent | null> {
    const [row] = await this.db
      .select()
      .from(problemsSchema)
      .innerJoin(
        problemVersionsSchema,
        and(
          eq(problemVersionsSchema.problemId, problemsSchema.id),
          eq(problemVersionsSchema.version, problemsSchema.currentVersion),
        ),
      )
      .where(
        and(
          eq(problemsSchema.slug, slug),
          eq(problemsSchema.status, "published"),
        ),
      )
      .limit(1);

    return row
      ? {
          problem: toProblem(row.problems),
          version: toVersion(row.problem_versions),
        }
      : null;
  }

  public async findVersion(
    problemId: string,
    version: number,
  ): Promise<ProblemVersionEntity | null> {
    const [row] = await this.db
      .select()
      .from(problemVersionsSchema)
      .where(
        and(
          eq(problemVersionsSchema.problemId, problemId),
          eq(problemVersionsSchema.version, version),
        ),
      )
      .limit(1);

    return row ? toVersion(row) : null;
  }

  public syncOfficial({
    content,
    contentHash,
  }: OfficialProblemSync): Promise<SyncOutcome> {
    return transaction(async () => {
      const [existing] = await this.db
        .select()
        .from(problemsSchema)
        .where(eq(problemsSchema.slug, content.slug))
        .for("update")
        .limit(1);

      if (!existing) {
        const [created] = await this.db
          .insert(problemsSchema)
          .values({
            slug: content.slug,
            source: "official",
            status: "published",
            currentVersion: 1,
            publishedAt: new Date(),
            ...fields(content),
          })
          .returning();

        await this.db.insert(problemVersionsSchema).values({
          problemId: created!.id,
          version: 1,
          contentHash,
          content,
        });

        return "created";
      }

      const [current] = await this.db
        .select({ contentHash: problemVersionsSchema.contentHash })
        .from(problemVersionsSchema)
        .where(
          and(
            eq(problemVersionsSchema.problemId, existing.id),
            eq(problemVersionsSchema.version, existing.currentVersion),
          ),
        )
        .limit(1);

      if (current?.contentHash === contentHash) return "unchanged";

      const version = existing.currentVersion + 1;

      await this.db.insert(problemVersionsSchema).values({
        problemId: existing.id,
        version,
        contentHash,
        content,
      });
      await this.db
        .update(problemsSchema)
        .set({
          currentVersion: version,
          updatedAt: new Date(),
          ...fields(content),
        })
        .where(eq(problemsSchema.id, existing.id));

      return "versioned";
    });
  }
}
