import { and, asc, eq, gt } from "drizzle-orm";

import { type InterviewEventRow, interviewEventsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type CreateInterviewEventData,
  InterviewEventsRepository,
} from "../ports/interview-events.repository";

export class PostgresInterviewEventsRepository extends InterviewEventsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(
    data: CreateInterviewEventData,
  ): Promise<InterviewEventRow> {
    const [row] = await this.db
      .insert(interviewEventsSchema)
      .values(data)
      .returning();

    return row!;
  }

  public listAfter(
    interviewId: string,
    after: number | null,
  ): Promise<InterviewEventRow[]> {
    return this.db
      .select()
      .from(interviewEventsSchema)
      .where(
        and(
          eq(interviewEventsSchema.interviewId, interviewId),
          after === null ? undefined : gt(interviewEventsSchema.seq, after),
        ),
      )
      .orderBy(asc(interviewEventsSchema.seq));
  }
}
