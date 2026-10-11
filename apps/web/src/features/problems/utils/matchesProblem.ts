import type {
  ProblemProgressModel,
  ProblemSummaryModel,
} from "@repo/api-client";

export type ProblemStatus = "all" | "new" | "tried";

export const matchesProblem = (
  problem: Pick<ProblemSummaryModel, "title" | "summary" | "tags">,
  progress: Pick<ProblemProgressModel, "submissions"> | undefined,
  { query, status }: { query: string; status: ProblemStatus },
): boolean => {
  const tried = (progress?.submissions ?? 0) > 0;

  if (status === "new" && tried) return false;
  if (status === "tried" && !tried) return false;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = [problem.title, problem.summary, ...problem.tags]
    .join(" ")
    .toLowerCase();

  return words.every((word) => text.includes(word));
};
