import type { UserModel } from "@repo/api-client";
import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const currentUserQuery = queryOptions({
  queryKey: ["auth", "current-user"],
  queryFn: async (): Promise<UserModel | null> => {
    const result = await api.api.users.me.get();

    if (result.error?.status === 401) return null;

    return unwrap(result);
  },
  staleTime: 5 * 60_000,
});
