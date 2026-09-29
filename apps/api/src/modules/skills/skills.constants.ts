import type { InterviewDimension } from "@repo/design";

export const SKILL_SCORING_VERSION = 1;

export const SKILL_LABELS: Record<InterviewDimension, string> = {
  requirements: "Requirements",
  design: "Core design",
  scaling: "Scaling",
  reliability: "Reliability",
  communication: "Communication",
};

export const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;
