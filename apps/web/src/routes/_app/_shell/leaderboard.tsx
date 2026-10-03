import { createFileRoute } from "@tanstack/react-router";

import {
  leaderboardQuery,
  LeaderboardView,
  validateLeaderboardSearch,
} from "@/features/leaderboard";

export const Route = createFileRoute("/_app/_shell/leaderboard")({
  validateSearch: validateLeaderboardSearch,
  loaderDeps: ({ search }) => ({
    period: search.period ?? "all",
    track: search.track ?? null,
  }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(leaderboardQuery(deps)),
  component: LeaderboardRoute,
});

function LeaderboardRoute() {
  const { period, track } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <LeaderboardView
      filter={{ period: period ?? "all", track: track ?? null }}
      onFilterChange={(next) =>
        void navigate({
          search: {
            ...(next.period === "week" ? { period: "week" as const } : {}),
            ...(next.track ? { track: next.track } : {}),
          },
          replace: true,
        })
      }
    />
  );
}
