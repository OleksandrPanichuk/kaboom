import { defineRoute } from "@/core/route";

import { StartInterviewInput } from "../dto";
import { InterviewEntity } from "../interview.entity";
import { InterviewModel } from "../interview.model";
import { START_INTERVIEW_RATE_LIMIT } from "../interviews.constants";
import type { InterviewsActions } from "../interviews.routes";

export const startInterviewRoute = ({ startInterview }: InterviewsActions) =>
  defineRoute({
    body: StartInterviewInput,
    response: InterviewModel,
    summary: "Start an interview on a problem",
    description:
      "Pins the problem's current version, creates the design from its baseline and posts the interviewer's opening message. Answers 409 INTERVIEW_ALREADY_ACTIVE with the id of an interview still running, and 422 PROBLEM_NOT_INTERVIEWABLE for a problem without an interview.",
    auth: true,
    rateLimit: START_INTERVIEW_RATE_LIMIT,

    action: ({ body, user }) =>
      startInterview.execute({ ownerId: user.id, slug: body.slug }),
    postAction: ({ output }) => InterviewEntity.normalize(output),
  });
