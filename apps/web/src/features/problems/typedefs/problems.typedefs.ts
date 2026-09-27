import type { RunResultModel, SubmissionModel } from "@repo/api-client";

export type Difficulty = "easy" | "medium" | "hard";

export interface ProblemsSearch {
  difficulty?: Difficulty;
}

export type ProblemOutcome =
  | { kind: "run"; run: RunResultModel }
  | { kind: "submission"; submission: SubmissionModel };
