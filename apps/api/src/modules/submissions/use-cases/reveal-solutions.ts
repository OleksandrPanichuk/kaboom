import type { DesignGraph } from "@repo/design";

import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import {
  type SharedSolution,
  SolutionRevealsRepository,
  SubmissionsRepository,
} from "../ports";
import { MIN_SOLUTION_SCORE, SOLUTIONS_SHOWN } from "../submissions.constants";
import { SubmissionsService } from "../submissions.service";

export interface RevealSolutionsUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = RevealSolutionsUseCaseOptions;

interface Result {
  lockedUntil: Date;
  solutions: SharedSolution[];
}

const withoutNotes = (graph: DesignGraph): DesignGraph => ({
  ...graph,
  nodes: graph.nodes.map((node) => ({ ...node, notes: "" })),
});

export class RevealSolutionsUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly service = makeService(SubmissionsService);

  private readonly reveals = makeRepository(SolutionRevealsRepository);

  private readonly submissions = makeRepository(SubmissionsRepository);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);
    const reveal = await this.reveals.reveal(userId, problem.id, new Date());
    const solutions = await this.submissions.listSolutions(
      problem.id,
      userId,
      MIN_SOLUTION_SCORE,
      SOLUTIONS_SHOWN,
    );

    return {
      lockedUntil: this.service.lockedUntil(reveal.revealedAt)!,
      solutions: solutions.map((solution) => ({
        ...solution,
        graph: withoutNotes(solution.graph),
      })),
    };
  }
}
