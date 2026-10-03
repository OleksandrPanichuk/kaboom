import type { InterviewDimension } from "@repo/design";

export const SKILL_SCORING_VERSION = 1;

export const SUBMISSION_SKILL_WEIGHT = 10;

export const SKILL_HALF_LIFE_DAYS = 90;

export const DAY_MS = 86_400_000;

export const SKILL_LABELS: Record<InterviewDimension, string> = {
  requirements: "Requirements",
  design: "Core design",
  scaling: "Scaling",
  reliability: "Reliability",
  delivery: "Delivery",
  operability: "Operability",
  communication: "Communication",
};

export const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

export const TARGET_DIFFICULTY = [
  { below: 50, difficulty: "easy" },
  { below: 75, difficulty: "medium" },
  { below: Number.POSITIVE_INFINITY, difficulty: "hard" },
] as const;
