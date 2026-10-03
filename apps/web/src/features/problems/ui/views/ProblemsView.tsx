import { useSuspenseQuery } from "@tanstack/react-query";

import { problemsQuery, progressQuery } from "@/features/problems/api";
import type { ProblemsFilter } from "@/features/problems/typedefs";
import {
  DifficultyFilter,
  ProblemCard,
  ProblemsPage,
  RankCard,
  TrackFilter,
} from "@/features/problems/ui/components";

interface ProblemsViewProps {
  filter: ProblemsFilter;
  onFilterChange: (filter: ProblemsFilter) => void;
}

export function ProblemsView({ filter, onFilterChange }: ProblemsViewProps) {
  const { data: problems } = useSuspenseQuery(problemsQuery(filter));
  const { data: progress } = useSuspenseQuery(progressQuery);
  const bySlug = new Map(progress.problems.map((item) => [item.slug, item]));

  return (
    <ProblemsPage>
      <RankCard />
      <div className="flex flex-wrap gap-2">
        <TrackFilter
          value={filter.track}
          onChange={(track) => onFilterChange({ ...filter, track })}
        />
        <DifficultyFilter
          value={filter.difficulty}
          onChange={(difficulty) => onFilterChange({ ...filter, difficulty })}
        />
      </div>
      {problems.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-muted-foreground">
          No problems match these filters yet.
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
