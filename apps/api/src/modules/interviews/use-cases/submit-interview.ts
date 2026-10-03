import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignsService } from "@/modules/designs";

import type { InterviewEntity } from "../interview.entity";
import { TurnScheduler } from "../interviewer/scheduler";
import { InterviewsService } from "../interviews.service";
import { InterviewsRepository, ReviewScheduler } from "../ports";

export interface SubmitInterviewUseCaseOptions {
  ownerId: string;
  id: string;
  duringTurn?: boolean;
}

type Options = SubmitInterviewUseCaseOptions;
type Result = InterviewEntity;

export class SubmitInterviewUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  private readonly designs = makeService(DesignsService);

  private readonly interviews = makeRepository(InterviewsRepository);

  public async execute({
    ownerId,
    id,
    duringTurn = false,
  }: Options): Promise<Result> {
    const interview = await this.service.getOwned(id, ownerId);

    if (interview.status !== "active") return interview;

    const design = await this.designs.getOwned(interview.designId, ownerId);
    const ended = await this.service.commit(id, async (emit) => {
      const updated = await this.interviews.markReviewing(id, design.revision);

      if (!updated) return null;

      await this.designs.lock(design.id);
      await emit("status", {
        status: updated.status,
        finalRevision: updated.finalRevision,
      });

      return updated;
    });

    if (!ended) return this.service.getOwned(id, ownerId);

    if (duringTurn || makeService(TurnScheduler).interrupt(id)) return ended;

    await make(ReviewScheduler).schedule(id);

    return ended;
  }
}
