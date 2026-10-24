import { TRACKS } from "@repo/design";
import { t } from "elysia";

import {
  DESIGN_REVISION_AUTHORS,
  INTERVIEW_EVENT_TYPES,
  INTERVIEW_MESSAGE_AUTHORS,
  INTERVIEW_STATUSES,
} from "@/db";

export const InterviewMessageModel = t.Object({
  id: t.String({ format: "uuid" }),
  author: t.UnionEnum(INTERVIEW_MESSAGE_AUTHORS),
  body: t.String(),
  turnId: t.Nullable(t.String({ format: "uuid" })),
  interrupted: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
});
export type InterviewMessageModel = typeof InterviewMessageModel.static;

export const InterviewPhasePlanModel = t.Object({
  id: t.String(),
  minutes: t.Integer(),
  goal: t.String(),
});

export const InterviewProblemModel = t.Object({
  track: t.UnionEnum(TRACKS),
  slug: t.String(),
  title: t.String(),
  difficulty: t.String(),
  statement: t.String(),
  phases: t.Array(InterviewPhasePlanModel),
});

export const InterviewModel = t.Object({
  id: t.String({ format: "uuid" }),
  designId: t.String({ format: "uuid" }),
  problemVersion: t.Integer(),
  status: t.UnionEnum(INTERVIEW_STATUSES),
  phase: t.String(),
  phaseStartedAt: t.String({ format: "date-time" }),
  finalRevision: t.Nullable(t.Integer()),
  startedAt: t.String({ format: "date-time" }),
  endedAt: t.Nullable(t.String({ format: "date-time" })),
  lastSeq: t.Integer(),
  problem: InterviewProblemModel,
  messages: t.Array(InterviewMessageModel),
});
export type InterviewModel = typeof InterviewModel.static;

export const InterviewSummaryModel = t.Object({
  id: t.String({ format: "uuid" }),
  status: t.UnionEnum(INTERVIEW_STATUSES),
  phase: t.String(),
  startedAt: t.String({ format: "date-time" }),
  endedAt: t.Nullable(t.String({ format: "date-time" })),
  problem: t.Object({
    slug: t.String(),
    title: t.String(),
    difficulty: t.String(),
  }),
});
export type InterviewSummaryModel = typeof InterviewSummaryModel.static;

export const InterviewQuotaModel = t.Object({
  limit: t.Integer(),
  per: t.UnionEnum(["day", "week"]),
  used: t.Integer(),
  resetsAt: t.String({ format: "date-time" }),
});
export type InterviewQuotaModel = typeof InterviewQuotaModel.static;

export const InterviewStatusModel = t.Object({
  status: t.UnionEnum(INTERVIEW_STATUSES),
});
export type InterviewStatusModel = typeof InterviewStatusModel.static;

export const InterviewReplayEventModel = t.Object({
  seq: t.Integer(),
  type: t.UnionEnum(INTERVIEW_EVENT_TYPES),
  at: t.String({ format: "date-time" }),
  payload: t.Unknown(),
});
export type InterviewReplayEventModel = typeof InterviewReplayEventModel.static;

export const InterviewReplayRevisionModel = t.Object({
  number: t.Integer(),
  author: t.UnionEnum(DESIGN_REVISION_AUTHORS),
  at: t.String({ format: "date-time" }),
  ops: t.Array(t.Unknown()),
  snapshot: t.Unknown({
    description:
      "The whole graph, set on the first revision and on some later ones",
  }),
});
export type InterviewReplayRevisionModel =
  typeof InterviewReplayRevisionModel.static;

export const InterviewReplayModel = t.Object({
  ...InterviewModel.properties,
  events: t.Array(InterviewReplayEventModel),
  revisions: t.Array(InterviewReplayRevisionModel, {
    description: "Oldest first, each with the ops that made it",
  }),
  layout: t.Record(t.String(), t.Object({ x: t.Number(), y: t.Number() })),
});
export type InterviewReplayModel = typeof InterviewReplayModel.static;
