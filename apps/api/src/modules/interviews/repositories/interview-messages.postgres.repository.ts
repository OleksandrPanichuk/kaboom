import { asc, eq } from "drizzle-orm";

import { interviewMessagesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { InterviewMessageEntity } from "../interview.entity";
import {
  type CreateInterviewMessageData,
  InterviewMessagesRepository,
} from "../ports/interview-messages.repository";

export class PostgresInterviewMessagesRepository extends InterviewMessagesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(
    data: CreateInterviewMessageData,
  ): Promise<InterviewMessageEntity> {
    const [row] = await this.db
      .insert(interviewMessagesSchema)
      .values(data)
      .returning();

    return row!;
  }

  public listFor(interviewId: string): Promise<InterviewMessageEntity[]> {
    return this.db
      .select()
      .from(interviewMessagesSchema)
      .where(eq(interviewMessagesSchema.interviewId, interviewId))
      .orderBy(
        asc(interviewMessagesSchema.createdAt),
        asc(interviewMessagesSchema.id),
      );
  }
}
