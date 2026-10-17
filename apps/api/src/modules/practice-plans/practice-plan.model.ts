import { TRACKS } from "@repo/design";
import { INTERVIEW_DIMENSIONS } from "@repo/scoring";
import { t } from "elysia";

export const PracticePlanStepModel = t.Object({
  position: t.Integer(),
  slug: t.String(),
  title: t.String(),
  difficulty: t.String(),
  interviewable: t.Boolean(),
  done: t.Boolean({
    description:
      "Whether the caller submitted to it, or had an interview on it reviewed, this week",
  }),
});
export type PracticePlanStepModel = typeof PracticePlanStepModel.static;

export const PracticePlanModel = t.Object({
  id: t.String({ format: "uuid" }),
  track: t.UnionEnum(TRACKS),
  skill: t.Nullable(
    t.UnionEnum(INTERVIEW_DIMENSIONS, {
      description: "The weakest skill the plan aims at, null before any score",
    }),
  ),
  skillLabel: t.Nullable(t.String()),
  startsAt: t.String({ format: "date-time" }),
  endsAt: t.String({ format: "date-time" }),
  steps: t.Array(PracticePlanStepModel),
  done: t.Integer(),
  total: t.Integer(),
});
export type PracticePlanModel = typeof PracticePlanModel.static;

export const PracticePlanMessageModel = t.Object({ message: t.String() });
export type PracticePlanMessageModel = typeof PracticePlanMessageModel.static;
