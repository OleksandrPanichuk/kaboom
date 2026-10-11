import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { SolutionsModel } from "../submission.model";
import { REVEAL_RATE_LIMIT } from "../submissions.constants";
import type { SubmissionsActions } from "../submissions.routes";

export const revealSolutionsRoute = ({ revealSolutions }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    response: SolutionsModel,
    summary:
      "Show other solvers' best solutions, locking this problem's points unless it is solved",
    description:
      "Answers, anonymously and without their notes, the best submission of each other solver that scored 80 or more, newest first. Once the caller has a submission that passed every test, showing them costs nothing. Before that, showing them is the act that locks: every submission to this problem in the seven days after it is scored but does not count toward points, and showing them again restarts the seven days.",
    auth: true,
    rateLimit: REVEAL_RATE_LIMIT,

    action: ({ params, user }) =>
      revealSolutions.execute({ userId: user.id, slug: params.slug }),
    postAction: ({ output }) => ({
      lockedUntil: output.lockedUntil?.toISOString() ?? null,
      solutions: output.solutions.map((solution) => ({
        score: solution.score,
        problemVersion: solution.problemVersion,
        graph: solution.graph,
        submittedAt: solution.createdAt.toISOString(),
      })),
    }),
  });
