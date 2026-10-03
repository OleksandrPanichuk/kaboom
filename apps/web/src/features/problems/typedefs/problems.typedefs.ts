import type { RunResultModel, SubmissionModel } from "@repo/api-client";
import type { Track } from "@repo/design";

export type Difficulty = "easy" | "medium" | "hard";

export interface ProblemsSearch {
  difficulty?: Difficulty;
  track?: Track;
}

export interface ProblemsFilter {
  difficulty: Difficulty | null;
  track: Track | null;
}

export type ProblemOutcome =
  | { kind: "run"; run: RunResultModel }
  | { kind: "submission"; submission: SubmissionModel };
