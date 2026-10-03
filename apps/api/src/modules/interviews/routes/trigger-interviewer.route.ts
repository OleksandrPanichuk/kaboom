import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { INTERVIEW_TRIGGER_RATE_LIMIT } from "../interviews.constants";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const triggerInterviewerRoute = ({
  triggerInterviewer,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: t.Object({ kind: t.Literal("design-settled") }),
    response: t.Object({ accepted: t.Boolean() }),
    summary: "Tell the interviewer the design has settled",
    description:
      "The client sends design-settled once the candidate has stopped editing for a few seconds. The interviewer decides whether to speak, and interjects at most once a minute on its own.",
    auth: true,
    rateLimit: INTERVIEW_TRIGGER_RATE_LIMIT,

    action: async ({ params, body, user, set }) => {
      await triggerInterviewer.execute({
        ownerId: user.id,
        id: params.id,
        trigger: body.kind,
      });
      set.status = 202;
    },
    postAction: () => ({ accepted: true }),
  });
