import { t } from "elysia";

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
});
export type ItemResultModel = typeof ItemResultModel.static;

export const RunResultModel = t.Object({
  revision: t.Integer(),
  drills: t.Array(DrillResultModel),
});
export type RunResultModel = typeof RunResultModel.static;

export const SubmissionModel = t.Object({
  id: t.String({ format: "uuid" }),
  designId: t.String({ format: "uuid" }),
  problemVersion: t.Integer(),
  revision: t.Integer(),
  score: t.Integer(),
  hintPenalty: t.Integer(),
  items: t.Array(ItemResultModel),
  drills: t.Array(DrillResultModel),
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
