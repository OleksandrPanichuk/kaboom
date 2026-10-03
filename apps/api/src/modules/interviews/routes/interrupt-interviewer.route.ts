import { t } from "elysia";

import { defineRoute } from "@/core/route";

import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const interruptInterviewerRoute = ({
  interruptInterviewer,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: t.Optional(t.Object({})),
    response: t.Object({ interrupted: t.Boolean() }),
    summary: "Stop the interviewer mid-turn",
    description:
      "Aborts the turn in progress: it applies no further tool, and what it had said so far is kept, marked as interrupted.",
    auth: true,

    action: async ({ params, user, set }) => {
      const result = await interruptInterviewer.execute({
        ownerId: user.id,
        id: params.id,
      });

      set.status = 202;

      return result;
    },
  });
