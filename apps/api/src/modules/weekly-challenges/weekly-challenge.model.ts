import { TRACKS } from "@repo/design";
import { t } from "elysia";

import { PROBLEM_DIFFICULTIES } from "@/db";

export const WeeklyChallengeEntryModel = t.Object({
  position: t.Integer({ minimum: 1 }),
  handle: t.String(),
  displayName: t.String(),
  avatarUrl: t.Nullable(t.String()),
  score: t.Integer(),
  mine: t.Boolean(),
});
export type WeeklyChallengeEntryModel = typeof WeeklyChallengeEntryModel.static;

export const WeeklyChallengeModel = t.Object({
  weekStart: t.String({
    description: "The Monday, in UTC, the week began on (YYYY-MM-DD)",
  }),
  endsAt: t.String({ format: "date-time" }),
  problem: t.Object({
    slug: t.String(),
    title: t.String(),
    summary: t.String(),
    track: t.UnionEnum(TRACKS),
    difficulty: t.UnionEnum(PROBLEM_DIFFICULTIES),
  }),
  participants: t.Integer({
    description: "People with a counted submission this week, listed or not",
  }),
  entries: t.Array(WeeklyChallengeEntryModel, {
    description: "The best scores this week among visible profiles, best first",
  }),
  me: t.Object({
    score: t.Nullable(t.Integer()),
    attempts: t.Integer(),
    position: t.Nullable(t.Integer({ minimum: 1 })),
  }),
});
export type WeeklyChallengeModel = typeof WeeklyChallengeModel.static;

export const WeeklyChallengeResponseModel = t.Object({
  challenge: t.Nullable(WeeklyChallengeModel, {
    description: "Null when there is no official problem to feature",
  }),
});
export type WeeklyChallengeResponseModel =
  typeof WeeklyChallengeResponseModel.static;
