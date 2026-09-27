import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { InterviewView } from "../interview.entity";
import { InterviewsService } from "../interviews.service";
import { InterviewMessagesRepository } from "../ports";

export interface GetInterviewUseCaseOptions {
  ownerId: string;
  id: string;
}

type Options = GetInterviewUseCaseOptions;
type Result = InterviewView;

export class GetInterviewUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  private readonly messages = makeRepository(InterviewMessagesRepository);

  public async execute({ ownerId, id }: Options): Promise<Result> {
    const interview = await this.service.getOwned(id, ownerId);
    const [pinned, messages] = await Promise.all([
      this.service.pinned(interview),
      this.messages.listFor(id),
    ]);

    return { interview, problem: this.service.describe(pinned), messages };
  }
}
