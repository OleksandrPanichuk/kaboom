import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { AttemptEntity } from "../submission.entity";
import { AttemptModel } from "../submission.model";
import type { SubmissionsActions } from "../submissions.routes";

export const startProblemRoute = ({ startProblem }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    response: AttemptModel,
    summary: "Start a problem, or open the attempt already started",
    description:
      "Creates the solver's design from the current version's baseline and pins that version for every run and submission of the attempt. Starting again returns the same attempt.",
    auth: true,

    action: ({ params, user }) =>
      startProblem.execute({ userId: user.id, slug: params.slug }),
    postAction: ({ output }) => AttemptEntity.normalize(output),
  });
