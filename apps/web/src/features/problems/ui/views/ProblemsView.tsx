import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Input } from "@/components/ui/Input";
import { problemsQuery, progressQuery } from "@/features/problems/api";
import type { ProblemsFilter } from "@/features/problems/typedefs";
import {
  DifficultyFilter,
  ProblemRow,
  ProblemsPage,
  RankCard,
  TrackFilter,
} from "@/features/problems/ui/components";
import { matchesProblem, type ProblemStatus } from "@/features/problems/utils";

interface ProblemsViewProps {
  filter: ProblemsFilter;
  onFilterChange: (filter: ProblemsFilter) => void;
}

const STATUS_OPTIONS: Array<{ value: ProblemStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "Not tried" },
  { value: "tried", label: "Tried" },
];

export function ProblemsView({ filter, onFilterChange }: ProblemsViewProps) {
  const { data: problems } = useSuspenseQuery(problemsQuery(filter));
  const { data: progress } = useSuspenseQuery(progressQuery);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProblemStatus>("all");
  const deferred = useDeferredValue(query);
  const bySlug = new Map(progress.problems.map((item) => [item.slug, item]));
  const shown = problems.items.filter((problem) =>
    matchesProblem(problem, bySlug.get(problem.slug), {
      query: deferred,
      status,
    }),
  );

  return (
    <ProblemsPage aside={<RankCard compact />}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search problems"
            placeholder="Search by name or tag"
            value={query}
            className="h-9 bg-card pl-8"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:shrink-0 [&>*]:flex-nowrap">
          <TrackFilter
            value={filter.track}
            onChange={(track) => onFilterChange({ ...filter, track })}
          />
          <DifficultyFilter
            value={filter.difficulty}
            onChange={(difficulty) => onFilterChange({ ...filter, difficulty })}
          />
          <SegmentedControl
            name="status"
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(next) =>
              setStatus(
                STATUS_OPTIONS.find((option) => option.value === next)!.value,
              )
            }
          />
        </div>
      </div>
      <p role="status" className="-mb-3 text-sm text-muted-foreground">
        {shown.length} {shown.length === 1 ? "problem" : "problems"}
      </p>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No problems match these filters.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {shown.map((problem) => (
            <ProblemRow
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
