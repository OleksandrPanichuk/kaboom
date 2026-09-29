import { defineRoute } from "@/core/route";

import { SkillsModel } from "../skill.model";
import type { SkillsActions } from "../skills.routes";

export const getMySkillsRoute = ({ getMySkills }: SkillsActions) =>
  defineRoute({
    response: SkillsModel,
    summary: "Get the signed-in user's skills and what to practise next",
    description:
      "Each skill is the weighted average of every reviewed interview's rubric items for it, from 0 to 100, or null before any review touched it. next suggests the interview that practises the weakest skill, preferring problems tried least.",
    auth: true,

    action: ({ user }) => getMySkills.execute({ userId: user.id }),
  });
