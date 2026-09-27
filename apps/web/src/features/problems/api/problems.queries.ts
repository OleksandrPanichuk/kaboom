import { queryOptions } from "@tanstack/react-query";

import type { Difficulty } from "@/features/problems/typedefs";
import { api, ApiRequestError, unwrap } from "@/lib/api";

export const problemsQuery = (difficulty: Difficulty | null) =>
  queryOptions({
    queryKey: ["problems", "list", difficulty],
    queryFn: async () =>
      unwrap(
        await api.api.problems.get({
          query: difficulty ? { difficulty, limit: 100 } : { limit: 100 },
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
