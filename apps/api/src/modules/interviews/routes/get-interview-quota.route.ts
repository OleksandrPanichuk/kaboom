import { defineRoute } from "@/core/route";

import { InterviewEntity } from "../interview.entity";
import { InterviewQuotaModel } from "../interview.model";
import type { InterviewsActions } from "../interviews.routes";

export const getInterviewQuotaRoute = ({
  getInterviewQuota,
}: InterviewsActions) =>
  defineRoute({
    response: InterviewQuotaModel,
    summary: "How many interviews the caller has left in the plan's period",
    description:
      "The plan's allowance, how many interviews were started in the current day or week, and when it resets. Starting one past the allowance answers 402 PLAN_LIMIT.",
    auth: true,

    action: ({ user }) => getInterviewQuota.execute({ ownerId: user.id }),
    postAction: ({ output }) => InterviewEntity.normalizeQuota(output),
  });
