import type { ProblemContent } from "./schema";

export interface RevealedHint {
  index: number;
  title: string;
  body: string;
  cost: number;
}

export const revealedHints = (
  problem: ProblemContent,
  revealed: number,
): RevealedHint[] =>
  problem.hints
    .slice(0, Math.max(0, revealed))
    .map((hint, index) => ({ index, ...hint }));

export const hintPenalty = (
  problem: ProblemContent,
  revealed: number,
): number =>
  revealedHints(problem, revealed).reduce((sum, hint) => sum + hint.cost, 0);

export const penalised = (score: number, penalty: number): number =>
  Math.max(0, score - penalty);
