import { make } from "@/core/registry";
import { ReviewSubmissionJob } from "@/modules/reviews/jobs/review-submission.job";
import { SubmissionReviewScheduler } from "@/modules/submissions/ports/submission-review-scheduler";

export class JobSubmissionReviewScheduler extends SubmissionReviewScheduler {
  public schedule(submissionId: string): Promise<void> {
    return make(ReviewSubmissionJob).dispatch({ submissionId });
  }
}
