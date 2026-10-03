import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { InterviewStatusModel } from "../interview.model";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const submitInterviewRoute = ({ submitInterview }: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: t.Optional(t.Object({})),
    response: InterviewStatusModel,
    summary: "End the interview and hand it to review",
    description:
      "Locks the design at its current revision and moves the interview to reviewing. Submitting again changes nothing.",
    auth: true,

    action: ({ params, user }) =>
      submitInterview.execute({ ownerId: user.id, id: params.id }),
    postAction: ({ output }) => ({ status: output.status }),
  });
