import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const connectedAccountsQuery = queryOptions({
  queryKey: ["security", "accounts"],
  queryFn: async () => unwrap(await api.api.auth.accounts.get()),
});

export const sessionsQuery = queryOptions({
  queryKey: ["security", "sessions"],
  queryFn: async () => unwrap(await api.api.sessions.get()),
});
