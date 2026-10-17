import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { PracticePlanView } from "../practice-plan.entity";
import { PracticePlansService } from "../practice-plans.service";

export interface GetCurrentPracticePlanUseCaseOptions {
  userId: string;
}

type Options = GetCurrentPracticePlanUseCaseOptions;
type Result = PracticePlanView;

export class GetCurrentPracticePlanUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(PracticePlansService);

  public execute({ userId }: Options): Promise<Result> {
    return this.service.current(userId, new Date());
  }
}
