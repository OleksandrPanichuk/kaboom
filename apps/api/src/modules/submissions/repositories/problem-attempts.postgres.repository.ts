import { and, eq, lt, sql } from "drizzle-orm";

import { problemAttemptsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type CreateAttemptData,
  ProblemAttemptsRepository,
} from "../ports/problem-attempts.repository";
import type { AttemptEntity } from "../submission.entity";

export class PostgresProblemAttemptsRepository extends ProblemAttemptsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async find(
    userId: string,
    problemId: string,
  ): Promise<AttemptEntity | null> {
    const [row] = await this.db
      .select()
      .from(problemAttemptsSchema)
      .where(
        and(
          eq(problemAttemptsSchema.userId, userId),
          eq(problemAttemptsSchema.problemId, problemId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public async insert(data: CreateAttemptData): Promise<AttemptEntity> {
    const [row] = await this.db
      .insert(problemAttemptsSchema)
      .values(data)
      .returning();

    return row!;
  }

  public async moveToVersion(
    id: string,
    version: number,
    hints: number,
  ): Promise<AttemptEntity | null> {
    const [row] = await this.db
      .update(problemAttemptsSchema)
      .set({
        problemVersion: version,
        hintsRevealed: sql`least(${problemAttemptsSchema.hintsRevealed}, ${hints})`,
      })
      .where(
        and(
          eq(problemAttemptsSchema.id, id),
          lt(problemAttemptsSchema.problemVersion, version),
        ),
      )
      .returning();

    return row ?? null;
  }

  public async revealHint(
    id: string,
    index: number,
  ): Promise<AttemptEntity | null> {
    const [row] = await this.db
      .update(problemAttemptsSchema)
      .set({ hintsRevealed: sql`${problemAttemptsSchema.hintsRevealed} + 1` })
      .where(
        and(
          eq(problemAttemptsSchema.id, id),
          eq(problemAttemptsSchema.hintsRevealed, index),
        ),
      )
      .returning();

    return row ?? null;
  }
}
