import { defineRoute } from "@/core/route";

import { PostInterviewMessageInput } from "../dto";
import { InterviewMessageEntity } from "../interview.entity";
import { InterviewMessageModel } from "../interview.model";
import { INTERVIEW_MESSAGE_RATE_LIMIT } from "../interviews.constants";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const postInterviewMessageRoute = ({
  postInterviewMessage,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: PostInterviewMessageInput,
    response: InterviewMessageModel,
    summary: "Say something to the interviewer",
    description:
      "Stores the message and answers at once; the interviewer's reply arrives on the event stream.",
    auth: true,
    rateLimit: INTERVIEW_MESSAGE_RATE_LIMIT,

    action: ({ params, body, user }) =>
      postInterviewMessage.execute({
        ownerId: user.id,
        id: params.id,
        body: body.body,
      }),
    postAction: ({ output }) => InterviewMessageEntity.normalize(output),
  });
