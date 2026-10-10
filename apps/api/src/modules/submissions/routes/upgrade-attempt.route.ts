import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { AttemptEntity } from "../submission.entity";
import { AttemptModel } from "../submission.model";
import type { SubmissionsActions } from "../submissions.routes";

export const upgradeAttemptRoute = ({ upgradeAttempt }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    response: AttemptModel,
    summary: "Move the solver's attempt to the problem's current version",
    description:
      "Keeps the design and pins the current version for every later run and submission. Hints already revealed stay revealed, as many as the new version has, and cost what it says. Submissions made before keep the version they were scored on. An attempt already on the current version is returned unchanged.",
    auth: true,

    action: ({ params, user }) =>
      upgradeAttempt.execute({ userId: user.id, slug: params.slug }),
    postAction: ({ output }) => AttemptEntity.normalize(output),
  });
