import { and, eq } from "drizzle-orm";

import { solutionRevealsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type SolutionReveal,
  SolutionRevealsRepository,
} from "../ports/solution-reveals.repository";

const COLUMNS = {
  problemId: solutionRevealsSchema.problemId,
  revealedAt: solutionRevealsSchema.revealedAt,
};

export class PostgresSolutionRevealsRepository extends SolutionRevealsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async find(
    userId: string,
    problemId: string,
  ): Promise<SolutionReveal | null> {
    const [row] = await this.db
      .select(COLUMNS)
      .from(solutionRevealsSchema)
      .where(
        and(
          eq(solutionRevealsSchema.userId, userId),
          eq(solutionRevealsSchema.problemId, problemId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public listForUser(userId: string): Promise<SolutionReveal[]> {
    return this.db
      .select(COLUMNS)
      .from(solutionRevealsSchema)
      .where(eq(solutionRevealsSchema.userId, userId));
  }

  public async reveal(
    userId: string,
    problemId: string,
    at: Date,
  ): Promise<SolutionReveal> {
    const [row] = await this.db
      .insert(solutionRevealsSchema)
      .values({ userId, problemId, revealedAt: at })
      .onConflictDoUpdate({
        target: [solutionRevealsSchema.userId, solutionRevealsSchema.problemId],
        set: { revealedAt: at },
      })
      .returning(COLUMNS);

    return row!;
  }
}
