import { createFileRoute } from "@tanstack/react-router";

import {
  ProblemsPendingView,
  problemsQuery,
  ProblemsView,
  progressQuery,
  validateProblemsSearch,
} from "@/features/problems";

export const Route = createFileRoute("/_app/_shell/problems/")({
  validateSearch: validateProblemsSearch,
  loaderDeps: ({ search }) => ({
    difficulty: search.difficulty ?? null,
    track: search.track ?? null,
  }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(problemsQuery(deps)),
      context.queryClient.ensureQueryData(progressQuery),
    ]),
  pendingComponent: ProblemsPendingView,
  component: ProblemsRoute,
});

function ProblemsRoute() {
  const { difficulty, track } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ProblemsView
      filter={{ difficulty: difficulty ?? null, track: track ?? null }}
      onFilterChange={(next) =>
        void navigate({
          search: {
            ...(next.difficulty ? { difficulty: next.difficulty } : {}),
            ...(next.track ? { track: next.track } : {}),
          },
          replace: true,
        })
      }
    />
  );
}
