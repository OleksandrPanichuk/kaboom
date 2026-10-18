import { defineRoute } from "@/core/route";

import { InterviewEntity } from "../interview.entity";
import { InterviewReplayModel } from "../interview.model";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const getInterviewReplayRoute = ({
  getInterviewReplay,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    response: InterviewReplayModel,
    summary: "Everything an ended interview went through, to play it back",
    description:
      "The messages, every event in order, and the design's revisions with the ops that made each, so a client can rebuild the canvas at any moment. Answers 409 INTERVIEW_STILL_RUNNING while the interview is active.",
    auth: true,

    action: ({ params, user }) =>
      getInterviewReplay.execute({ ownerId: user.id, id: params.id }),
    postAction: ({ output }) => InterviewEntity.normalizeReplay(output),
  });
