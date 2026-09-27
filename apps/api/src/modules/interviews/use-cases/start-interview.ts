import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import { CreateDesignUseCase } from "@/modules/designs";
import { ProblemsService } from "@/modules/problems";

import type { InterviewView } from "../interview.entity";
import {
  InterviewAlreadyActiveError,
  ProblemNotInterviewableError,
} from "../interviews.errors";
import { InterviewsService } from "../interviews.service";
import { InterviewMessagesRepository, InterviewsRepository } from "../ports";
import { GetInterviewUseCase } from "./get-interview";

export interface StartInterviewUseCaseOptions {
  ownerId: string;
  slug: string;
}

type Options = StartInterviewUseCaseOptions;
type Result = InterviewView;

export class StartInterviewUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly service = makeService(InterviewsService);

  private readonly interviews = makeRepository(InterviewsRepository);

  private readonly messages = makeRepository(InterviewMessagesRepository);

  public async execute({ ownerId, slug }: Options): Promise<Result> {
    const { problem, version } = await this.problems.getPublished(slug);
    const plan = version.content.interview;

    if (!plan) {
      throw new ProblemNotInterviewableError(
        "This problem cannot be interviewed yet",
      );
    }

    const active = await this.interviews.findActive(ownerId);

    if (active) {
      throw new InterviewAlreadyActiveError(
        "Finish the interview you started first",
        { interviewId: active.id },
      );
    }

    const interview = await transaction(async () => {
      const design = await make(CreateDesignUseCase).execute({
        ownerId,
        name: `${problem.title} interview`,
        baseline: version.content.baseline,
      });

      return this.interviews.insert({
        ownerId,
        problemId: problem.id,
        problemVersion: version.version,
        designId: design.id,
        phase: plan.phases[0]!.id,
      });
    });

    await this.service.commit(interview.id, async (emit) => {
      const opening = await this.messages.insert({
        interviewId: interview.id,
        author: "interviewer",
        body: plan.opening,
      });

      await emit("message", { messageId: opening.id });
    });

    return make(GetInterviewUseCase).execute({ ownerId, id: interview.id });
  }
}
