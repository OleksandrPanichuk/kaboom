import type { DrillScore, ItemScore } from "@repo/design";
import { avg, count, desc, eq } from "drizzle-orm";

import { problemsSchema, type ReviewRow, reviewsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type CreateReviewData,
  type ReviewedInterview,
  ReviewsRepository,
  type ReviewTotals,
} from "../ports/reviews.repository";
import type { ReviewEntity, ReviewItem } from "../review.entity";

const toEntity = (row: ReviewRow): ReviewEntity => ({
  ...row,
  items: row.items as ReviewItem[],
  checks: row.checks as ItemScore[],
  drills: row.drills as DrillScore[],
});

export class PostgresReviewsRepository extends ReviewsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: CreateReviewData): Promise<ReviewEntity | null> {
    const [row] = await this.db
      .insert(reviewsSchema)
      .values(data)
      .onConflictDoNothing({ target: reviewsSchema.interviewId })
      .returning();

    return row ? toEntity(row) : null;
  }

  public async findByInterview(
    interviewId: string,
  ): Promise<ReviewEntity | null> {
    const [row] = await this.db
      .select()
      .from(reviewsSchema)
      .where(eq(reviewsSchema.interviewId, interviewId))
      .limit(1);

    return row ? toEntity(row) : null;
  }

  public async listForUser(
    userId: string,
    limit: number,
  ): Promise<ReviewedInterview[]> {
    const rows = await this.db
      .select({
        interviewId: reviewsSchema.interviewId,
        score: reviewsSchema.score,
        slug: problemsSchema.slug,
        title: problemsSchema.title,
        at: reviewsSchema.createdAt,
      })
      .from(reviewsSchema)
      .innerJoin(problemsSchema, eq(problemsSchema.id, reviewsSchema.problemId))
      .where(eq(reviewsSchema.userId, userId))
      .orderBy(desc(reviewsSchema.createdAt))
      .limit(limit);

    return rows.map(({ slug, title, ...row }) => ({
      ...row,
      problem: { slug, title },
    }));
  }

  public async totalsFor(userId: string): Promise<ReviewTotals> {
    const [row] = await this.db
      .select({
        reviewed: count(reviewsSchema.id),
        averageScore: avg(reviewsSchema.score),
      })
      .from(reviewsSchema)
      .where(eq(reviewsSchema.userId, userId));

    return {
      reviewed: row?.reviewed ?? 0,
      averageScore:
        row?.averageScore === null || row?.averageScore === undefined
          ? null
          : Math.round(Number(row.averageScore)),
    };
  }
}
