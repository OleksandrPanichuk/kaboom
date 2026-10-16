import { TRACKS } from "@repo/design";
import { INTERVIEW_DIMENSIONS } from "@repo/scoring";
import { t } from "elysia";

import { DESIGN_KINDS, SHARE_SUBJECTS } from "@/db";

export const ShareModel = t.Object({
  token: t.String(),
  url: t.String({
    description:
      "The link to hand out. It answers crawlers with a preview and sends people on to the page.",
  }),
  imageUrl: t.String(),
  subject: t.UnionEnum(SHARE_SUBJECTS),
  subjectId: t.String({ format: "uuid" }),
  createdAt: t.String({ format: "date-time" }),
});
export type ShareModel = typeof ShareModel.static;

export const SharedInterviewModel = t.Object({
  problem: t.Object({
    slug: t.String(),
    title: t.String(),
    track: t.UnionEnum(TRACKS),
    difficulty: t.String(),
  }),
  score: t.Nullable(t.Integer()),
  designScore: t.Integer(),
  summary: t.String(),
  strengths: t.Array(t.String()),
  improvements: t.Array(t.String()),
  items: t.Array(
    t.Object({
      title: t.String(),
      dimension: t.UnionEnum(INTERVIEW_DIMENSIONS),
      weight: t.Integer(),
      score: t.Nullable(t.Integer({ minimum: 0, maximum: 3 })),
      rationale: t.String(),
    }),
  ),
  endedAt: t.Nullable(t.String({ format: "date-time" })),
});
export type SharedInterviewModel = typeof SharedInterviewModel.static;

export const SharedModel = t.Object({
  subject: t.UnionEnum(SHARE_SUBJECTS),
  title: t.String(),
  kind: t.UnionEnum(DESIGN_KINDS),
  sharedAt: t.String({ format: "date-time" }),
  url: t.String(),
  imageUrl: t.String(),
  owner: t.Nullable(
    t.Object(
      {
        handle: t.String(),
        displayName: t.String(),
        avatarUrl: t.Nullable(t.String()),
      },
      { description: "Null when the owner's profile is hidden" },
    ),
  ),
  graph: t.Unknown({ description: "The design as it stands now" }),
  layout: t.Record(t.String(), t.Object({ x: t.Number(), y: t.Number() })),
  interview: t.Nullable(SharedInterviewModel),
});
export type SharedModel = typeof SharedModel.static;

export const ShareMessageModel = t.Object({ message: t.String() });
export type ShareMessageModel = typeof ShareMessageModel.static;
