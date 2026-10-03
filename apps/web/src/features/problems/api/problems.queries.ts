import { queryOptions } from "@tanstack/react-query";

import type { ProblemsFilter } from "@/features/problems/typedefs";
import { api, ApiRequestError, unwrap } from "@/lib/api";

export const ALL_PROBLEMS: ProblemsFilter = { difficulty: null, track: null };

export const problemsQuery = ({ difficulty, track }: ProblemsFilter) =>
  queryOptions({
    queryKey: ["problems", "list", difficulty, track],
    queryFn: async () =>
      unwrap(
        await api.api.problems.get({
          query: {
            limit: 100,
            ...(difficulty ? { difficulty } : {}),
            ...(track ? { track } : {}),
          },
        }),
      ),
  });

export const problemQuery = (slug: string) =>
  queryOptions({
    queryKey: ["problems", "detail", slug],
    queryFn: async () => unwrap(await api.api.problems(slug).get()),
  });

export const attemptQuery = (slug: string) =>
  queryOptions({
    queryKey: ["problems", "attempt", slug],
    queryFn: async () => {
      try {
        return unwrap(await api.api.problems(slug).attempt.get());
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404)
          return null;

        throw error;
      }
    },
  });

export const submissionsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["problems", "submissions", slug],
    queryFn: async () =>
      unwrap(
        await api.api.problems(slug).submissions.get({ query: { limit: 50 } }),
      ),
  });

export const progressQuery = queryOptions({
  queryKey: ["progress"],
  queryFn: async () => unwrap(await api.api.progress.get()),
});
