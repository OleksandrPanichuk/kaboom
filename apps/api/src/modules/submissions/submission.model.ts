import { INTERVIEW_DIMENSIONS, TEST_STATUSES, TEST_SUITES } from "@repo/design";
import { t } from "elysia";

import { SUBMISSION_REVIEW_STATUSES } from "@/db";

export const RevealedHintModel = t.Object({
  index: t.Integer(),
  title: t.String(),
  body: t.String(),
  cost: t.Integer(),
});
export type RevealedHintModel = typeof RevealedHintModel.static;

export const AttemptModel = t.Object({
  designId: t.String({ format: "uuid" }),
  problemVersion: t.Integer(),
  hints: t.Array(RevealedHintModel),
  hintPenalty: t.Integer(),
  lockedUntil: t.Nullable(t.String({ format: "date-time" })),
  createdAt: t.String({ format: "date-time" }),
});
export type AttemptModel = typeof AttemptModel.static;

export const DrillResultModel = t.Object({
  id: t.String(),
  title: t.String(),
  visibility: t.UnionEnum(["public", "hidden"]),
  passed: t.Boolean(),
  failures: t.Array(t.String()),
});
export type DrillResultModel = typeof DrillResultModel.static;

export const ItemResultModel = t.Object({
  key: t.String(),
  title: t.String(),
  weight: t.Integer(),
  passed: t.Boolean(),
  evidence: t.String(),
  ratio: t.Optional(
    t.Number({
      minimum: 0,
      maximum: 1,
      description: "The share of the weight earned, for an item scored in part",
    }),
  ),
});
export type ItemResultModel = typeof ItemResultModel.static;

export const AssertionModel = t.Object({
  label: t.String(),
  expected: t.String(),
  actual: t.String(),
  passed: t.Boolean(),
  at: t.Nullable(t.Number()),
  nodeIds: t.Array(t.String()),
  message: t.Nullable(t.String()),
});
export type AssertionModel = typeof AssertionModel.static;

export const TestResultModel = t.Object({
  id: t.String(),
  suite: t.UnionEnum(TEST_SUITES),
  title: t.String(),
  description: t.String(),
  visibility: t.UnionEnum(["public", "hidden"]),
  status: t.UnionEnum(TEST_STATUSES),
  assertions: t.Array(AssertionModel),
  durationMs: t.Number(),
  replay: t.Nullable(
    t.Unknown({
      description:
        "The load scenario the test ran, faults resolved to node ids, for evaluating it again in the browser",
    }),
  ),
});
export type TestResultModel = typeof TestResultModel.static;

export const TestReportModel = t.Object({
  tests: t.Array(TestResultModel),
  summary: t.Object({
    passed: t.Integer(),
    failed: t.Integer(),
    flaky: t.Integer(),
    skipped: t.Integer(),
  }),
  durationMs: t.Number(),
});
export type TestReportModel = typeof TestReportModel.static;

export const RunResultModel = t.Object({
  revision: t.Integer(),
  report: TestReportModel,
});
export type RunResultModel = typeof RunResultModel.static;

export const DesignReviewModel = t.Object({
  summary: t.String(),
  strengths: t.Array(t.String()),
  improvements: t.Array(t.String()),
  items: t.Array(
    t.Object({
      dimension: t.UnionEnum(INTERVIEW_DIMENSIONS),
      score: t.Integer({ minimum: 0, maximum: 3 }),
      rationale: t.String(),
    }),
  ),
});
export type DesignReviewModel = typeof DesignReviewModel.static;

export const SubmissionModel = t.Object({
  id: t.String({ format: "uuid" }),
  designId: t.String({ format: "uuid" }),
  problemVersion: t.Integer(),
  revision: t.Integer(),
  score: t.Integer(),
  deterministicScore: t.Integer(),
  reviewStatus: t.UnionEnum(SUBMISSION_REVIEW_STATUSES),
  reviewScore: t.Nullable(t.Integer()),
  review: t.Nullable(DesignReviewModel),
  hintPenalty: t.Integer(),
  counted: t.Boolean(),
  items: t.Array(ItemResultModel),
  drills: t.Array(DrillResultModel),
  tests: t.Nullable(TestReportModel),
  createdAt: t.String({ format: "date-time" }),
});
export type SubmissionModel = typeof SubmissionModel.static;

export const ProblemProgressModel = t.Object({
  slug: t.String(),
  title: t.String(),
  difficulty: t.UnionEnum(["easy", "medium", "hard"]),
  bestScore: t.Integer(),
  points: t.Integer(),
  submissions: t.Integer(),
  lockedUntil: t.Nullable(t.String({ format: "date-time" })),
});
export type ProblemProgressModel = typeof ProblemProgressModel.static;

export const ProgressModel = t.Object({
  points: t.Integer(),
  rank: t.Object({
    name: t.String(),
    points: t.Integer(),
    floorPoints: t.Integer(),
    nextName: t.Nullable(t.String()),
    nextPoints: t.Nullable(t.Integer()),
  }),
  problems: t.Array(ProblemProgressModel),
});
export type ProgressModel = typeof ProgressModel.static;

export const SolutionModel = t.Object({
  score: t.Integer(),
  problemVersion: t.Integer(),
  graph: t.Unknown(),
  submittedAt: t.String({ format: "date-time" }),
});
export type SolutionModel = typeof SolutionModel.static;

export const SolutionsModel = t.Object({
  lockedUntil: t.String({ format: "date-time" }),
  solutions: t.Array(SolutionModel),
});
export type SolutionsModel = typeof SolutionsModel.static;
