import { randomBytes } from "node:crypto";

import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import { MAX_DRAFTS } from "../authoring.constants";
import { DraftLimitError } from "../authoring.errors";
import { AuthoringService } from "../authoring.service";
import { starterProblem } from "../authoring.starter";
import type { DraftView } from "../draft.entity";
import { ProblemDraftsRepository } from "../ports";

export interface CreateDraftUseCaseOptions {
  authorId: string;
  forkOf: string | null;
}

type Options = CreateDraftUseCaseOptions;
type Result = DraftView;

const suffix = () => randomBytes(3).toString("hex");

export class CreateDraftUseCase extends UseCase<Options, Result> {
  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly problems = makeService(ProblemsService);

  private readonly authoring = makeService(AuthoringService);

  public async execute({ authorId, forkOf }: Options): Promise<Result> {
    if ((await this.drafts.countForAuthor(authorId)) >= MAX_DRAFTS) {
      throw new DraftLimitError(
        `You can keep ${MAX_DRAFTS} drafts; delete one to start another`,
      );
    }

    if (forkOf === null) {
      return this.authoring.view(
        await this.drafts.create({
          authorId,
          content: starterProblem(`my-problem-${suffix()}`),
          forkedFromId: null,
        }),
      );
    }

    const { problem, version } = await this.problems.getPublished(forkOf);
    const content = {
      ...version.content,
      slug: `${problem.slug.slice(0, 50)}-${suffix()}`,
      title: `${version.content.title} (fork)`.slice(0, 120),
    };

    return this.authoring.view(
      await this.drafts.create({
        authorId,
        content,
        forkedFromId: problem.id,
      }),
    );
  }
}
