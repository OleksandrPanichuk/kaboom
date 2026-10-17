import { defineRoute } from "@/core/route";

import { PracticePlanMessageModel } from "../practice-plan.model";
import type { PracticePlansActions } from "../practice-plans.routes";

export const dropPracticePlanRoute = ({
  dropPracticePlan,
}: PracticePlansActions) =>
  defineRoute({
    response: PracticePlanMessageModel,
    summary: "Drop this week's practice plan",
    auth: true,

    action: ({ user }) => dropPracticePlan.execute({ userId: user.id }),
    postAction: () => ({ message: "ok" }),
  });
