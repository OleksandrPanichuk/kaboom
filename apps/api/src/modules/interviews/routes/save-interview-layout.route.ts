import { defineRoute } from "@/core/route";
import { DesignMessageModel, SaveDesignLayoutInput } from "@/modules/designs";

import { INTERVIEW_OPS_RATE_LIMIT } from "../interviews.constants";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const saveInterviewLayoutRoute = ({
  saveInterviewLayout,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: SaveDesignLayoutInput,
    response: DesignMessageModel,
    summary: "Save where the interview design's nodes sit",
    auth: true,
    rateLimit: INTERVIEW_OPS_RATE_LIMIT,

    action: ({ params, body, user }) =>
      saveInterviewLayout.execute({
        ownerId: user.id,
        id: params.id,
        layout: body.layout,
      }),
    postAction: () => ({ message: "ok" }),
  });
