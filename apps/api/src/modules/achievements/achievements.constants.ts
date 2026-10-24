export const SHARP_SCORE = 90;
export const SOLVER_TARGET = 10;
export const STREAK_TARGETS = [7, 30] as const;

export type BadgeKey =
  | "first-solve"
  | "solver-10"
  | "sharp-shooter"
  | "every-track"
  | "first-interview"
  | "streak-7"
  | "streak-30"
  | "author";

export interface BadgeDefinition {
  key: BadgeKey;
  title: string;
  description: string;
}

export const BADGES: readonly BadgeDefinition[] = [
  {
    key: "first-solve",
    title: "First solve",
    description: "Pass every test of a problem.",
  },
  {
    key: "solver-10",
    title: "Ten solved",
    description: "Pass every test of ten different problems.",
  },
  {
    key: "sharp-shooter",
    title: "Sharp shooter",
    description: `Score ${SHARP_SCORE} or more on a challenge.`,
  },
  {
    key: "every-track",
    title: "All-rounder",
    description: "Solve a problem in every track.",
  },
  {
    key: "first-interview",
    title: "First interview",
    description: "Finish an interview and read its review.",
  },
  {
    key: "streak-7",
    title: "A week running",
    description: "Practise seven days in a row.",
  },
  {
    key: "streak-30",
    title: "A month running",
    description: "Practise thirty days in a row.",
  },
  {
    key: "author",
    title: "Author",
    description: "Have a problem you wrote published.",
  },
];
