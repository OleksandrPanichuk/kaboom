import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const entitlementsQuery = queryOptions({
  queryKey: ["entitlements", "me"],
  queryFn: async () => unwrap(await api.api.entitlements.me.get()),
  staleTime: 60 * 1000,
});
