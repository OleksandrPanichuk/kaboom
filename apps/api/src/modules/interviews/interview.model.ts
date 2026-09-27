import { t } from "elysia";

import { INTERVIEW_MESSAGE_AUTHORS, INTERVIEW_STATUSES } from "@/db";

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

export const InterviewStatusModel = t.Object({
  status: t.UnionEnum(INTERVIEW_STATUSES),
});
export type InterviewStatusModel = typeof InterviewStatusModel.static;
