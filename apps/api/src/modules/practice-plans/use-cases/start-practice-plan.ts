import type { Track } from "@repo/design";

import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { PracticePlanView } from "../practice-plan.entity";
import { PracticePlansService } from "../practice-plans.service";

export interface StartPracticePlanUseCaseOptions {
  userId: string;
  track: Track;
}

type Options = StartPracticePlanUseCaseOptions;
type Result = PracticePlanView;

export class StartPracticePlanUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(PracticePlansService);

  public execute({ userId, track }: Options): Promise<Result> {
    return this.service.start(userId, track, new Date());
  }
}
