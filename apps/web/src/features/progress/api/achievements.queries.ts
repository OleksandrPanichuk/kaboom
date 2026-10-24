import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const achievementsQuery = queryOptions({
  queryKey: ["achievements", "me"],
  queryFn: async () => unwrap(await api.api.achievements.me.get()),
  staleTime: 60 * 1000,
});
