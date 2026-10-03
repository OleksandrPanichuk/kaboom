import { defineRoute } from "@/core/route";

import { InterviewEntity } from "../interview.entity";
import { InterviewModel } from "../interview.model";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const getInterviewRoute = ({ getInterview }: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    response: InterviewModel,
    summary: "Get an interview with its messages",
    description:
      "Includes lastSeq: open GET /interviews/:id/events with since=lastSeq to receive every event after this state exactly once.",
    auth: true,

    action: ({ params, user }) =>
      getInterview.execute({ ownerId: user.id, id: params.id }),
    postAction: ({ output }) => InterviewEntity.normalize(output),
  });
