import { INTERVIEW_DIMENSIONS } from "@repo/design";
import { t } from "elysia";

import { DrillResultModel, ItemResultModel } from "@/modules/submissions";

export const ReviewCitationModel = t.Object({
  label: t.String(),
  kind: t.UnionEnum(["message", "note", "drill", "check"]),
  text: t.String(),
});
export type ReviewCitationModel = typeof ReviewCitationModel.static;

export const ReviewItemModel = t.Object({
  key: t.String(),
  title: t.String(),
  dimension: t.UnionEnum(INTERVIEW_DIMENSIONS),
  weight: t.Integer(),
  score: t.Nullable(t.Integer({ minimum: 0, maximum: 3 })),
  rationale: t.String(),
  citations: t.Array(ReviewCitationModel),
});
export type ReviewItemModel = typeof ReviewItemModel.static;

export const ReviewModel = t.Object({
  id: t.String({ format: "uuid" }),
  interviewId: t.String({ format: "uuid" }),
  revision: t.Integer(),
  score: t.Nullable(t.Integer()),
  designScore: t.Integer(),
  summary: t.String(),
  strengths: t.Array(t.String()),
  improvements: t.Array(t.String()),
  items: t.Array(ReviewItemModel),
  checks: t.Array(ItemResultModel),
  drills: t.Array(DrillResultModel),
  createdAt: t.String({ format: "date-time" }),
});
export type ReviewModel = typeof ReviewModel.static;
