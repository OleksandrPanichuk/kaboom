import { make } from "@/core/registry";
import { ReviewScheduler } from "@/modules/interviews/ports/review-scheduler";
import { GenerateReviewJob } from "@/modules/reviews/jobs/generate-review.job";

export class JobReviewScheduler extends ReviewScheduler {
  public schedule(interviewId: string): Promise<void> {
    return make(GenerateReviewJob).dispatch({ interviewId });
  }
}
