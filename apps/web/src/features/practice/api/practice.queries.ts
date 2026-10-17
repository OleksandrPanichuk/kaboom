import { queryOptions } from "@tanstack/react-query";

import { api, ApiRequestError, unwrap } from "@/lib/api";

export const practicePlanKey = ["practice-plan", "current"] as const;

export const practicePlanQuery = queryOptions({
  queryKey: practicePlanKey,
  queryFn: async () => {
    try {
      return unwrap(await api.api.practicePlans.current.get());
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) return null;

      throw error;
    }
  },
});
