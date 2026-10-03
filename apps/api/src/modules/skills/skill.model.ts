import { INTERVIEW_DIMENSIONS, TRACKS } from "@repo/design";
import { t } from "elysia";

export const SkillSummaryModel = t.Object({
  skill: t.UnionEnum(INTERVIEW_DIMENSIONS),
  label: t.String(),
  score: t.Nullable(t.Integer({ minimum: 0, maximum: 100 })),
  samples: t.Integer(),
});
export type SkillSummaryModel = typeof SkillSummaryModel.static;

export const NextProblemModel = t.Object({
  track: t.UnionEnum(TRACKS),
  slug: t.String(),
  title: t.String(),
  difficulty: t.String(),
  skill: t.Nullable(t.UnionEnum(INTERVIEW_DIMENSIONS)),
  reason: t.String(),
});
export type NextProblemModel = typeof NextProblemModel.static;

export const SkillsModel = t.Object({
  skills: t.Array(SkillSummaryModel),
  next: t.Array(NextProblemModel),
});
export type SkillsModel = typeof SkillsModel.static;
