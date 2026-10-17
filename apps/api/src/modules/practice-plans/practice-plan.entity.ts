import type { Track } from "@repo/design";
import type { InterviewDimension } from "@repo/scoring";

import { SKILL_LABELS } from "@/modules/skills/skills.constants";

import type { PracticePlanModel } from "./practice-plan.model";
import { weekBounds } from "./practice-plans.helpers";

export interface PracticePlanEntity {
  id: string;
  userId: string;
  weekStart: string;
  track: Track;
  skill: InterviewDimension | null;
  createdAt: Date;
  remindedAt: Date | null;
}

export interface PracticePlanStep {
  position: number;
  slug: string;
  title: string;
  difficulty: string;
  interviewable: boolean;
  done: boolean;
}

export interface PracticePlanView {
  plan: PracticePlanEntity;
  steps: PracticePlanStep[];
}

export class PracticePlanEntity {
  public static normalize({
    plan,
    steps,
  }: PracticePlanView): PracticePlanModel {
    const { from, to } = weekBounds(plan.weekStart);

    return {
      id: plan.id,
      track: plan.track,
      skill: plan.skill,
      skillLabel: plan.skill === null ? null : SKILL_LABELS[plan.skill],
      startsAt: from.toISOString(),
      endsAt: to.toISOString(),
      steps,
      done: steps.filter((step) => step.done).length,
      total: steps.length,
    };
  }
}
