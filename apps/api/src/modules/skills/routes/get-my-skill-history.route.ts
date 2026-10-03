import { defineRoute } from "@/core/route";

import { SkillHistoryModel } from "../skill.model";
import type { SkillsActions } from "../skills.routes";

export const getMySkillHistoryRoute = ({ getMySkillHistory }: SkillsActions) =>
  defineRoute({
    response: SkillHistoryModel,
    summary:
      "Get every skill score the signed-in user has earned, oldest first",
    description:
      "One point per skill per reviewed interview or challenge submission, from 0 to 100, with the weight it rests on, so a client can draw how each skill moved.",
    auth: true,

    action: ({ user }) => getMySkillHistory.execute({ userId: user.id }),
    postAction: ({ output }) => ({
      points: output.map((point) => ({
        ...point,
        score: Math.round(point.score * 100),
        at: point.at.toISOString(),
      })),
    }),
  });
