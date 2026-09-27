import { useSuspenseQuery } from "@tanstack/react-query";

import { problemsQuery, progressQuery } from "@/features/problems/api";
import type { Difficulty } from "@/features/problems/typedefs";
import {
  DifficultyFilter,
  ProblemCard,
  ProblemsPage,
  RankCard,
} from "@/features/problems/ui/components";

interface ProblemsViewProps {
  difficulty: Difficulty | null;
  onDifficultyChange: (difficulty: Difficulty | null) => void;
}

export function ProblemsView({
  difficulty,
  onDifficultyChange,
}: ProblemsViewProps) {
  const { data: problems } = useSuspenseQuery(problemsQuery(difficulty));
  const { data: progress } = useSuspenseQuery(progressQuery);
  const bySlug = new Map(progress.problems.map((item) => [item.slug, item]));

  return (
    <ProblemsPage>
      <RankCard />
      <DifficultyFilter value={difficulty} onChange={onDifficultyChange} />
      {problems.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-muted-foreground">
          No problems at this difficulty yet.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {problems.items.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              progress={bySlug.get(problem.slug)}
            />
          ))}
        </ul>
      )}
    </ProblemsPage>
  );
}
