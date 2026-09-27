import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const designsListKey = ["designs", "list"] as const;

export const designsQuery = infiniteQueryOptions({
  queryKey: designsListKey,
  queryFn: async ({ pageParam }) =>
    unwrap(
      await api.api.designs.get({
        query: pageParam === null ? {} : { cursor: pageParam },
      }),
    ),
  initialPageParam: null as string | null,
  getNextPageParam: (page) => page.nextCursor,
});

export const designQuery = (id: string) =>
  queryOptions({
    queryKey: ["designs", "detail", id],
    queryFn: async () => unwrap(await api.api.designs(id).get()),
  });
