import type { ProblemDifficulty } from "@/db";

import { DIFFICULTY_WEIGHT, RANKS } from "./submissions.constants";

export interface Rank {
  name: string;
  points: number;
  nextName: string | null;
  nextPoints: number | null;
}

export const pointsFor = (
  bestScore: number,
  difficulty: ProblemDifficulty,
): number => bestScore * DIFFICULTY_WEIGHT[difficulty];

export const rankFor = (points: number): Rank => {
  let index = 0;

  RANKS.forEach((rank, position) => {
    if (points >= rank.points) index = position;
  });

  const next = RANKS[index + 1];

  return {
    name: RANKS[index]!.name,
    points,
    nextName: next?.name ?? null,
    nextPoints: next?.points ?? null,
  };
};
