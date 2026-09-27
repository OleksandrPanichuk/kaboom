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
  loaderDeps: ({ search }) => ({ difficulty: search.difficulty ?? null }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(problemsQuery(deps.difficulty)),
      context.queryClient.ensureQueryData(progressQuery),
    ]),
  pendingComponent: ProblemsPendingView,
  component: ProblemsRoute,
});

function ProblemsRoute() {
  const { difficulty } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ProblemsView
      difficulty={difficulty ?? null}
      onDifficultyChange={(next) =>
        void navigate({
          search: next ? { difficulty: next } : {},
          replace: true,
        })
      }
    />
  );
}
