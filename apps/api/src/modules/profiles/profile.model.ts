import { TRACKS } from "@repo/design";
import { INTERVIEW_DIMENSIONS } from "@repo/scoring";
import { t } from "elysia";

import { PROBLEM_DIFFICULTIES } from "@/db";

export const MyProfileModel = t.Object({
  handle: t.String(),
  displayName: t.String(),
  bio: t.String(),
  links: t.Array(t.String()),
  avatarUrl: t.Nullable(t.String()),
  visible: t.Boolean(),
});
export type MyProfileModel = typeof MyProfileModel.static;

export const PublicProfileModel = t.Object({
  handle: t.String(),
  displayName: t.String(),
  bio: t.String(),
  links: t.Array(t.String()),
  avatarUrl: t.Nullable(t.String()),
  joinedAt: t.String({ format: "date-time" }),
  own: t.Boolean({
    description: "Whether the caller is looking at their own profile",
  }),
  visible: t.Boolean(),
  standing: t.Object({
    points: t.Integer(),
    solved: t.Integer(),
    rank: t.String(),
    position: t.Nullable(
      t.Integer({ description: "All-time place on the leaderboard" }),
    ),
  }),
  skills: t.Array(
    t.Object({
      skill: t.UnionEnum(INTERVIEW_DIMENSIONS),
      label: t.String(),
      score: t.Nullable(t.Number()),
      samples: t.Integer(),
    }),
  ),
  recent: t.Array(
    t.Object({
      problem: t.Object({ slug: t.String(), title: t.String() }),
      score: t.Integer(),
      at: t.String({ format: "date-time" }),
    }),
  ),
  problems: t.Array(
    t.Object({
      slug: t.String(),
      title: t.String(),
      summary: t.String(),
      track: t.UnionEnum(TRACKS),
      difficulty: t.UnionEnum(PROBLEM_DIFFICULTIES),
      publishedAt: t.Nullable(t.String({ format: "date-time" })),
      solvers: t.Integer({
        description: "People other than the author who passed every test",
      }),
    }),
    { description: "Published problems this person wrote, newest first" },
  ),
});
export type PublicProfileModel = typeof PublicProfileModel.static;
