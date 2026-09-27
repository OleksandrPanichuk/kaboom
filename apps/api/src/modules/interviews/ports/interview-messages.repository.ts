import { Repository } from "@/core/repository";
import type { InterviewMessageAuthor } from "@/db";

import type { InterviewMessageEntity } from "../interview.entity";

export interface CreateInterviewMessageData {
  interviewId: string;
  author: InterviewMessageAuthor;
  body: string;
  turnId?: string | null;
  interrupted?: boolean;
  createdAt?: Date;
}

export abstract class InterviewMessagesRepository extends Repository {
  public abstract insert(
    data: CreateInterviewMessageData,
  ): Promise<InterviewMessageEntity>;

  public abstract listFor(
    interviewId: string,
  ): Promise<InterviewMessageEntity[]>;
}
