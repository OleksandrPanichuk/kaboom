import type { DrillScore, ItemScore } from "@repo/design";
import { eq } from "drizzle-orm";

import { type ReviewRow, reviewsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type CreateReviewData,
  ReviewsRepository,
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
}
