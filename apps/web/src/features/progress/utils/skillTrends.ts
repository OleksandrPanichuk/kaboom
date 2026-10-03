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

export const skillTrends = (points: readonly Point[]): SkillTrend[] => {
  const bySkill = new Map<Point["skill"], Point[]>();

  for (const point of points) {
    bySkill.set(point.skill, [...(bySkill.get(point.skill) ?? []), point]);
  }

  return [...bySkill.entries()].map(([skill, own]) => {
    let weighted = 0;
    let weight = 0;
    const trend = own.map((point) => {
      weighted += point.score * point.weight;
      weight += point.weight;

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
