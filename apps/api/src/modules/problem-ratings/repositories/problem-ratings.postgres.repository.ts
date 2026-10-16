import { and, eq, sql } from "drizzle-orm";

import { problemRatingsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { RatingTally } from "../problem-rating.entity";
import { MAX_STARS } from "../problem-ratings.constants";
import { ProblemRatingsRepository } from "../problem-ratings.repository";

export class PostgresProblemRatingsRepository extends ProblemRatingsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async tally(problemId: string, userId: string): Promise<RatingTally> {
    const rows = await this.db
      .select({
        stars: problemRatingsSchema.stars,
        count: sql<number>`count(*)::int`,
        mine: sql<boolean>`bool_or(${problemRatingsSchema.userId} = ${userId})`,
      })
      .from(problemRatingsSchema)
      .where(eq(problemRatingsSchema.problemId, problemId))
      .groupBy(problemRatingsSchema.stars);
    const distribution = Array.from({ length: MAX_STARS }, (_, index) =>
      rows
        .filter((row) => row.stars === index + 1)
        .reduce((sum, row) => sum + row.count, 0),
    );

    return {
      count: rows.reduce((sum, row) => sum + row.count, 0),
      total: rows.reduce((sum, row) => sum + row.stars * row.count, 0),
      distribution,
      mine: rows.find((row) => row.mine)?.stars ?? null,
    };
  }

  public async upsert(
    problemId: string,
    userId: string,
    stars: number,
  ): Promise<void> {
    const now = new Date();

    await this.db
      .insert(problemRatingsSchema)
      .values({ problemId, userId, stars, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [problemRatingsSchema.problemId, problemRatingsSchema.userId],
        set: { stars, updatedAt: now },
      });
  }

  public async delete(problemId: string, userId: string): Promise<void> {
    await this.db
      .delete(problemRatingsSchema)
      .where(
        and(
          eq(problemRatingsSchema.problemId, problemId),
          eq(problemRatingsSchema.userId, userId),
        ),
      );
  }
}
