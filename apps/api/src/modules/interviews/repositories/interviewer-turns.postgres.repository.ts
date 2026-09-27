import { asc, eq } from "drizzle-orm";

import {
  type InterviewerTurnRow,
  interviewerTurnsSchema,
  type InterviewerTurnStatus,
} from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import { InterviewerTurnsRepository } from "../ports/interviewer-turns.repository";

export class PostgresInterviewerTurnsRepository extends InterviewerTurnsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async start(
    interviewId: string,
    triggers: string[],
  ): Promise<InterviewerTurnRow> {
    const [row] = await this.db
      .insert(interviewerTurnsSchema)
      .values({ interviewId, triggers })
      .returning();

    return row!;
  }

  public async finish(
    id: string,
    result: { status: InterviewerTurnStatus; tokens: number; error?: string },
  ): Promise<void> {
    await this.db
      .update(interviewerTurnsSchema)
      .set({
        status: result.status,
        tokens: result.tokens,
        error: result.error ?? null,
        endedAt: new Date(),
      })
      .where(eq(interviewerTurnsSchema.id, id));
  }

  public listFor(interviewId: string): Promise<InterviewerTurnRow[]> {
    return this.db
      .select()
      .from(interviewerTurnsSchema)
      .where(eq(interviewerTurnsSchema.interviewId, interviewId))
      .orderBy(asc(interviewerTurnsSchema.startedAt));
  }
}
