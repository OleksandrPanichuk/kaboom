import { defineRoute } from "@/core/route";

import { StartPracticePlanInput } from "../dto";
import { PracticePlanEntity } from "../practice-plan.entity";
import { PracticePlanModel } from "../practice-plan.model";
import { START_PLAN_RATE_LIMIT } from "../practice-plans.constants";
import type { PracticePlansActions } from "../practice-plans.routes";

export const startPracticePlanRoute = ({
  startPracticePlan,
}: PracticePlansActions) =>
  defineRoute({
    body: StartPracticePlanInput,
    response: PracticePlanModel,
    summary: "Plan three problems for this week, aimed at the weakest skill",
    description:
      "Picks problems of the track that lean on the caller's weakest skill in it, the least practised first, at a difficulty near that skill's level. Starting again this week replaces the plan.",
    auth: true,
    rateLimit: START_PLAN_RATE_LIMIT,

    action: ({ body, user }) =>
      startPracticePlan.execute({ userId: user.id, track: body.track }),
    postAction: ({ output }) => PracticePlanEntity.normalize(output),
  });
