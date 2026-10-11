import { TRACKS } from "@repo/design";
import { t } from "elysia";

import { PROBLEM_DIFFICULTIES, PROBLEM_REVIEW_STATUSES } from "@/db";

const DRAFT_STATUSES = [
  "draft",
  "in-review",
  "changes-requested",
  "published",
] as const;

export const PublishIssueModel = t.Object({
  path: t.Array(t.Union([t.String(), t.Number()]), {
    description:
      "Where in the content the issue is, e.g. drills, 2, requirements, queries, 0",
  }),
  message: t.String(),
});
export type PublishIssueModel = typeof PublishIssueModel.static;

export const PublishCheckModel = t.Object({
  ok: t.Boolean(),
  issues: t.Array(PublishIssueModel),
});
export type PublishCheckModel = typeof PublishCheckModel.static;

const LinkedProblemModel = t.Object({ slug: t.String(), title: t.String() });

export const ProblemDraftSummaryModel = t.Object({
  id: t.String({ format: "uuid" }),
  title: t.String(),
  slug: t.Nullable(t.String()),
  status: t.UnionEnum(DRAFT_STATUSES),
  problemSlug: t.Nullable(t.String()),
  updatedAt: t.String({ format: "date-time" }),
});
export type ProblemDraftSummaryModel = typeof ProblemDraftSummaryModel.static;

export const ProblemDraftModel = t.Object({
  id: t.String({ format: "uuid" }),
  content: t.Unknown({
    description: "The problem as the author is writing it, valid or not",
  }),
  status: t.UnionEnum(DRAFT_STATUSES),
  problem: t.Nullable(
    t.Object({
      slug: t.String(),
      title: t.String(),
      currentVersion: t.Integer(),
    }),
  ),
  forkedFrom: t.Nullable(LinkedProblemModel),
  issues: t.Array(PublishIssueModel, {
    description:
      "What does not parse yet; the full check runs on check and submit",
  }),
  reviews: t.Array(
    t.Object({
      id: t.String({ format: "uuid" }),
      status: t.UnionEnum(PROBLEM_REVIEW_STATUSES),
      feedback: t.Nullable(t.String()),
      submittedAt: t.String({ format: "date-time" }),
      decidedAt: t.Nullable(t.String({ format: "date-time" })),
    }),
  ),
  updatedAt: t.String({ format: "date-time" }),
});
export type ProblemDraftModel = typeof ProblemDraftModel.static;

export const ProblemReviewSummaryModel = t.Object({
  id: t.String({ format: "uuid" }),
  draftId: t.String({ format: "uuid" }),
  status: t.UnionEnum(PROBLEM_REVIEW_STATUSES),
  slug: t.String(),
  title: t.String(),
  track: t.UnionEnum(TRACKS),
  difficulty: t.UnionEnum(PROBLEM_DIFFICULTIES),
  update: t.Boolean({
    description: "Whether it changes a problem already published",
  }),
  author: t.Nullable(t.Object({ handle: t.String(), displayName: t.String() })),
  submittedAt: t.String({ format: "date-time" }),
  decidedAt: t.Nullable(t.String({ format: "date-time" })),
});
export type ProblemReviewSummaryModel = typeof ProblemReviewSummaryModel.static;

export const ProblemReviewModel = t.Composite([
  ProblemReviewSummaryModel,
  t.Object({
    content: t.Unknown(),
    currentContent: t.Unknown({
      description: "The published version it would replace, or null",
    }),
    feedback: t.Nullable(t.String()),
  }),
]);
export type ProblemReviewModel = typeof ProblemReviewModel.static;
