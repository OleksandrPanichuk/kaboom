import { and, eq } from "drizzle-orm";

import { commentDigestsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import { CommentDigestsRepository } from "../ports";

export class PostgresCommentDigestsRepository extends CommentDigestsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async sentUpTo(
    userId: string,
    problemId: string,
  ): Promise<Date | null> {
    const [row] = await this.db
      .select({ sentUpTo: commentDigestsSchema.sentUpTo })
      .from(commentDigestsSchema)
      .where(
        and(
          eq(commentDigestsSchema.userId, userId),
          eq(commentDigestsSchema.problemId, problemId),
        ),
      )
      .limit(1);

    return row?.sentUpTo ?? null;
  }

  public async markSent(
    userId: string,
    problemId: string,
    upTo: Date,
  ): Promise<void> {
    await this.db
      .insert(commentDigestsSchema)
      .values({ userId, problemId, sentUpTo: upTo })
      .onConflictDoUpdate({
        target: [commentDigestsSchema.userId, commentDigestsSchema.problemId],
        set: { sentUpTo: upTo },
      });
  }
}
