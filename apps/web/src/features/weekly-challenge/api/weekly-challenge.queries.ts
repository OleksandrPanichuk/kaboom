import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const weeklyChallengeQuery = queryOptions({
  queryKey: ["weekly-challenge"],
  queryFn: async () => unwrap(await api.api.challenges.weekly.get()).challenge,
  staleTime: 60 * 1000,
});
