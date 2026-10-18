import type { Track } from "@repo/design";

import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { Metrics } from "@/platform/metrics";

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

  private readonly metrics = make(Metrics);

  public async execute({ userId, track }: Options): Promise<Result> {
    const plan = await this.service.start(userId, track, new Date());

    this.metrics.count("productEvents", 1, { event: "practice_plan" });

    return plan;
  }
}
