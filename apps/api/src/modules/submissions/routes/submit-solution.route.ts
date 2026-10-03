import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { SubmitSolutionInput } from "../dto";
import { SubmissionEntity } from "../submission.entity";
import { SubmissionModel } from "../submission.model";
import { SUBMIT_RATE_LIMIT } from "../submissions.constants";
import type { SubmissionsActions } from "../submissions.routes";

export const submitSolutionRoute = ({ submitSolution }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    body: SubmitSolutionInput,
    response: SubmissionModel,
    summary:
      "Score the attempt's design against every drill and keep the result",
    description:
      "Hidden drills are reported by title and outcome only. Answers 409 SUBMISSION_REVISION_MISMATCH when the revision given is not the design's current one.",
    auth: true,
    rateLimit: SUBMIT_RATE_LIMIT,

    action: ({ params, body, user }) =>
      submitSolution.execute({
        userId: user.id,
        slug: params.slug,
        revision: body.revision,
      }),
    postAction: ({ output }) => SubmissionEntity.normalize(output),
  });
