import type { Achievements } from "./achievements.compute";
import type { AchievementsModel } from "./achievements.model";

export type AchievementsView = Achievements;

export class AchievementsEntity {
  public static normalize({
    streak,
    badges,
  }: AchievementsView): AchievementsModel {
    return {
      streak,
      badges: badges.map((badge) => ({
        ...badge,
        earnedAt: badge.earnedAt?.toISOString() ?? null,
      })),
    };
  }
}
