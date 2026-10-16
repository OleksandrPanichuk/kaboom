import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const commentsKey = (slug: string) =>
  ["problems", "comments", slug] as const;

export const commentsQuery = (slug: string) =>
  infiniteQueryOptions({
    queryKey: commentsKey(slug),
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.api.problems(slug).comments.get({
          query: pageParam === null ? {} : { cursor: pageParam },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });

export const ratingQuery = (slug: string) =>
  queryOptions({
    queryKey: ["problems", "rating", slug],
    queryFn: async () => unwrap(await api.api.problems(slug).rating.get()),
  });
