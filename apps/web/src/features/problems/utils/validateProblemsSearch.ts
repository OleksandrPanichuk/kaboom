import type { Difficulty, ProblemsSearch } from "@/features/problems/typedefs";

const DIFFICULTIES: readonly string[] = ["easy", "medium", "hard"];

const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === "string" && DIFFICULTIES.includes(value);

export const validateProblemsSearch = (
  search: Record<string, unknown>,
): ProblemsSearch =>
  isDifficulty(search.difficulty) ? { difficulty: search.difficulty } : {};
