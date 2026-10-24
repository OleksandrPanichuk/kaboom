import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { DesignKind } from "@/features/designs/typedefs";
import { api, unwrap } from "@/lib/api";

export const designsListKey = ["designs", "list"] as const;

export const designsQuery = (kind: DesignKind | null) =>
  infiniteQueryOptions({
    queryKey: [...designsListKey, "page", kind ?? "all"],
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.api.designs.get({
          query: {
            origin: "sandbox" as const,
            ...(kind ? { kind } : {}),
            ...(pageParam === null ? {} : { cursor: pageParam }),
          },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });

export const designQuotaKey = ["designs", "quota"] as const;

export const designQuotaQuery = queryOptions({
  queryKey: designQuotaKey,
  queryFn: async () => unwrap(await api.api.designs.quota.get()),
});

export const schemaDesignsQuery = queryOptions({
  queryKey: [...designsListKey, "schema"],
  queryFn: async () =>
    unwrap(
      await api.api.designs.get({ query: { kind: "schema", limit: 100 } }),
    ),
});

export const designQuery = (id: string) =>
  queryOptions({
    queryKey: ["designs", "detail", id],
    queryFn: async () => unwrap(await api.api.designs(id).get()),
  });
