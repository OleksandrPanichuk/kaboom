import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { TurnScheduler } from "../interviewer/scheduler";
import type { Trigger } from "../interviewer/triggers";
import { InterviewsService } from "../interviews.service";

export interface TriggerInterviewerUseCaseOptions {
  ownerId: string;
  id: string;
  trigger: Extract<Trigger, "design-settled">;
}

type Options = TriggerInterviewerUseCaseOptions;
type Result = void;

export class TriggerInterviewerUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  public async execute({ ownerId, id, trigger }: Options): Promise<Result> {
    await this.service.getActive(id, ownerId);
    makeService(TurnScheduler).enqueue(id, trigger);
  }
}
