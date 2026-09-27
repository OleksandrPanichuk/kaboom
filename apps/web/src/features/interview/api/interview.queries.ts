import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const interviewQuery = (id: string) =>
  queryOptions({
    queryKey: ["interviews", "detail", id],
    queryFn: async () => unwrap(await api.api.interviews(id).get()),
  });

export const interviewsQuery = queryOptions({
  queryKey: ["interviews", "list"],
  queryFn: async () =>
    unwrap(await api.api.interviews.get({ query: { limit: 50 } })),
});
