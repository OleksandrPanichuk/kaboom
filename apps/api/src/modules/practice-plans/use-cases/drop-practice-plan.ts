import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { PracticePlansService } from "../practice-plans.service";

export interface DropPracticePlanUseCaseOptions {
  userId: string;
}

type Options = DropPracticePlanUseCaseOptions;
type Result = void;

export class DropPracticePlanUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(PracticePlansService);

  public execute({ userId }: Options): Promise<Result> {
    return this.service.drop(userId, new Date());
  }
}
