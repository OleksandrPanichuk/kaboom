import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { InterviewsRepository, InterviewsService } from "@/modules/interviews";

export class ReviewsService extends Service {
  private readonly interviews = makeService(InterviewsService);

  private readonly rows = makeRepository(InterviewsRepository);

  public async fail(interviewId: string): Promise<void> {
    await this.interviews.commit(interviewId, async (emit) => {
      const failed = await this.rows.transition(
        interviewId,
        "reviewing",
        "review_failed",
      );

      if (failed) await emit("status", { status: failed.status });
    });
  }
}
