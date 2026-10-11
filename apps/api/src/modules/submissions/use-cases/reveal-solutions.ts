import type { DesignGraph } from "@repo/design";
import { flattenBundle } from "@repo/scoring";

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
  lockedUntil: Date | null;
  solutions: Array<Omit<SharedSolution, "schemas">>;
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
    const lockedUntil = (await this.submissions.hasPassedAll(
      userId,
      problem.id,
    ))
      ? await this.service.lockOf(userId, problem.id)
      : this.service.lockedUntil(
          (await this.reveals.reveal(userId, problem.id, new Date()))
            .revealedAt,
        );
    const solutions = await this.submissions.listSolutions(
      problem.id,
      userId,
      MIN_SOLUTION_SCORE,
      SOLUTIONS_SHOWN,
    );

    return {
      lockedUntil,
      solutions: solutions.map(({ schemas, ...solution }) => ({
        ...solution,
        graph: withoutNotes(flattenBundle({ system: solution.graph, schemas })),
      })),
    };
  }
}
