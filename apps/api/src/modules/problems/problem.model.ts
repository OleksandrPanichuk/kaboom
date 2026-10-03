import { TRACKS } from "@repo/design";
import { t } from "elysia";

import { PROBLEM_DIFFICULTIES, PROBLEM_SOURCES } from "@/db";

export const ProblemSummaryModel = t.Object({
  id: t.String({ format: "uuid" }),
  slug: t.String(),
  source: t.UnionEnum(PROBLEM_SOURCES),
  track: t.UnionEnum(TRACKS),
  title: t.String(),
  summary: t.String(),
  difficulty: t.UnionEnum(PROBLEM_DIFFICULTIES),
  tags: t.Array(t.String()),
  version: t.Integer(),
  publishedAt: t.Nullable(t.String({ format: "date-time" })),
});
export type ProblemSummaryModel = typeof ProblemSummaryModel.static;

export const ProblemDrillModel = t.Object({
  id: t.String(),
  title: t.String(),
  description: t.String(),
  visibility: t.UnionEnum(["public", "hidden"]),
});
export type ProblemDrillModel = typeof ProblemDrillModel.static;

export const ProblemRubricItemModel = t.Object({
  key: t.String(),
  title: t.String(),
  weight: t.Integer(),
});
export type ProblemRubricItemModel = typeof ProblemRubricItemModel.static;

export const ProblemHintModel = t.Object({
  index: t.Integer(),
  title: t.String(),
  cost: t.Integer(),
});
export type ProblemHintModel = typeof ProblemHintModel.static;

export const ProblemModel = t.Object({
  ...ProblemSummaryModel.properties,
  statement: t.String(),
  baseline: t.Unknown(),
  drills: t.Array(ProblemDrillModel),
  rubric: t.Array(ProblemRubricItemModel),
  hints: t.Array(ProblemHintModel),
  interviewable: t.Boolean(),
});
export type ProblemModel = typeof ProblemModel.static;
