import type { SkillHistoryModel } from "@repo/api-client";

type Point = SkillHistoryModel["points"][number];

export interface TrendPoint {
  value: number;
  earned: number;
  problem: string;
  source: Point["source"];
  at: string;
}

export interface SkillTrend {
  skill: Point["skill"];
  points: TrendPoint[];
  current: number;
  change: number | null;
}

const DAY_MS = 86_400_000;

export const skillTrends = (
  points: readonly Point[],
  halfLifeDays: number,
): SkillTrend[] => {
  const bySkill = new Map<Point["skill"], Point[]>();

  for (const point of points) {
    bySkill.set(point.skill, [...(bySkill.get(point.skill) ?? []), point]);
  }

  return [...bySkill.entries()].map(([skill, own]) => {
    const trend = own.map((point, index) => {
      const at = new Date(point.at).getTime();
      let weighted = 0;
      let weight = 0;

      for (const earlier of own.slice(0, index + 1)) {
        const age = (at - new Date(earlier.at).getTime()) / DAY_MS;
        const decayed =
          earlier.weight * 0.5 ** (Math.max(0, age) / halfLifeDays);

        weighted += earlier.score * decayed;
        weight += decayed;
      }

      return {
        value: Math.round(weighted / weight),
        earned: point.score,
        problem: point.problem.title,
        source: point.source,
        at: point.at,
      };
    });
    const current = trend.at(-1)!.value;
    const previous = trend.at(-2)?.value;

    return {
      skill,
      points: trend,
      current,
      change: previous === undefined ? null : current - previous,
    };
  });
};
