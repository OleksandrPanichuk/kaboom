import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { TurnScheduler } from "../interviewer/scheduler";
import { InterviewsService } from "../interviews.service";

export interface InterruptInterviewerUseCaseOptions {
  ownerId: string;
  id: string;
}

type Options = InterruptInterviewerUseCaseOptions;
interface Result {
  interrupted: boolean;
}

export class InterruptInterviewerUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  public async execute({ ownerId, id }: Options): Promise<Result> {
    await this.service.getOwned(id, ownerId);

    return { interrupted: makeService(TurnScheduler).interrupt(id) };
  }
}
