import { ReviewScheduler } from "@/modules/interviews/ports/review-scheduler";

export class NoopReviewScheduler extends ReviewScheduler {
  public readonly scheduled: string[] = [];

  public schedule(interviewId: string): Promise<void> {
    this.scheduled.push(interviewId);

    return Promise.resolve();
  }
}
