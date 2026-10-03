import { t } from "elysia";

import { SUBMISSION_REVIEW_STATUSES } from "@/db";

export const ActivityItemModel = t.Object({
  kind: t.UnionEnum(["interview", "challenge"]),
  id: t.String({ format: "uuid" }),
  problem: t.Object({ slug: t.String(), title: t.String() }),
  score: t.Nullable(t.Integer()),
  counted: t.Boolean(),
  reviewStatus: t.Nullable(t.UnionEnum(SUBMISSION_REVIEW_STATUSES)),
  at: t.String({ format: "date-time" }),
});
export type ActivityItemModel = typeof ActivityItemModel.static;

export const ActivityModel = t.Object({
  items: t.Array(ActivityItemModel),
  totals: t.Object({
    interviewsReviewed: t.Integer(),
    averageInterviewScore: t.Nullable(t.Integer()),
  }),
});
export type ActivityModel = typeof ActivityModel.static;
