import { t } from "elysia";

export const BadgeModel = t.Object({
  key: t.String(),
  title: t.String(),
  description: t.String(),
  earnedAt: t.Nullable(t.String({ format: "date-time" })),
  progress: t.Object({ value: t.Integer(), target: t.Integer() }),
});
export type BadgeModel = typeof BadgeModel.static;

export const AchievementsModel = t.Object({
  streak: t.Object({
    current: t.Integer({
      description: "Days in a row, ending today or yesterday",
    }),
    longest: t.Integer(),
    activeToday: t.Boolean(),
  }),
  badges: t.Array(BadgeModel),
});
export type AchievementsModel = typeof AchievementsModel.static;
