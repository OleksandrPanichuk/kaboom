import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { AttemptEntity } from "../submission.entity";
import { AttemptModel } from "../submission.model";
import type { SubmissionsActions } from "../submissions.routes";

export const getAttemptRoute = ({ getAttempt }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    response: AttemptModel,
    summary: "Get the solver's attempt at a problem",
    auth: true,

    action: ({ params, user }) =>
      getAttempt.execute({ userId: user.id, slug: params.slug }),
    postAction: ({ output }) => AttemptEntity.normalize(output),
  });
