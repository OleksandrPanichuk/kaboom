import { defineRoute } from "@/core/route";

import { PracticePlanEntity } from "../practice-plan.entity";
import { PracticePlanModel } from "../practice-plan.model";
import type { PracticePlansActions } from "../practice-plans.routes";

export const getCurrentPracticePlanRoute = ({
  getCurrentPracticePlan,
}: PracticePlansActions) =>
  defineRoute({
    response: PracticePlanModel,
    summary: "This week's practice plan, with what is done",
    description:
      "Weeks start on Monday in UTC. Answers 404 PRACTICE_PLAN_NOT_FOUND when there is no plan this week.",
    auth: true,

    action: ({ user }) => getCurrentPracticePlan.execute({ userId: user.id }),
    postAction: ({ output }) => PracticePlanEntity.normalize(output),
  });
