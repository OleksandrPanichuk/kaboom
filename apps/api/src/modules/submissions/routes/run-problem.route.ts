import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { RunResultModel } from "../submission.model";
import { RUN_RATE_LIMIT } from "../submissions.constants";
import type { SubmissionsActions } from "../submissions.routes";

export const runProblemRoute = ({ runProblem }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    response: RunResultModel,
    summary: "Run the attempt's design against the problem's public drills",
    auth: true,
    rateLimit: RUN_RATE_LIMIT,

    action: ({ params, user }) =>
      runProblem.execute({ userId: user.id, slug: params.slug }),
  });
