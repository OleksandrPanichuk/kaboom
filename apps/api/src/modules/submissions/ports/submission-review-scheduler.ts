import { Port } from "@/core/port";

export abstract class SubmissionReviewScheduler extends Port {
  public abstract schedule(submissionId: string): Promise<void>;
}
