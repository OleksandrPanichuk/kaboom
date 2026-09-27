import { Repository } from "@/core/repository";
import type { InterviewEventRow, InterviewEventType } from "@/db";

export interface CreateInterviewEventData {
  interviewId: string;
  seq: number;
  type: InterviewEventType;
  payload: unknown;
}

export abstract class InterviewEventsRepository extends Repository {
  public abstract insert(
    data: CreateInterviewEventData,
  ): Promise<InterviewEventRow>;

  public abstract listAfter(
    interviewId: string,
    after: number | null,
  ): Promise<InterviewEventRow[]>;
}
