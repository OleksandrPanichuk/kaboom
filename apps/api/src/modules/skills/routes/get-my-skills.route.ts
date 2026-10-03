import { defineRoute } from "@/core/route";

import { SkillsModel } from "../skill.model";
import type { SkillsActions } from "../skills.routes";

export const getMySkillsRoute = ({ getMySkills }: SkillsActions) =>
  defineRoute({
    response: SkillsModel,
    summary: "Get the signed-in user's skills and what to practise next",
    description:
      "Each skill is the weighted average of its scores from reviewed interviews and challenge submissions, from 0 to 100, or null before any touched it. A score's weight halves every 90 days, so recent work counts most. next suggests one interview per track: the problem tried least, then the one leaning hardest on the weakest skill, then the difficulty nearest that skill's level.",
    auth: true,

    action: ({ user }) => getMySkills.execute({ userId: user.id }),
  });
