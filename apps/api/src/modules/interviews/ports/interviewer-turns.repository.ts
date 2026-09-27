import { Repository } from "@/core/repository";
import type { InterviewerTurnRow, InterviewerTurnStatus } from "@/db";

export abstract class InterviewerTurnsRepository extends Repository {
  public abstract start(
    interviewId: string,
    triggers: string[],
  ): Promise<InterviewerTurnRow>;

  public abstract finish(
    id: string,
    result: { status: InterviewerTurnStatus; tokens: number; error?: string },
  ): Promise<void>;

  public abstract listFor(interviewId: string): Promise<InterviewerTurnRow[]>;
}
