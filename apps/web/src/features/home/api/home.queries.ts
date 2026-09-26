import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const healthQuery = queryOptions({
  queryKey: ["health"],
  queryFn: async () => {
    const { data, error } = await api.api.health.get();

    if (error) throw new Error(error.message);

    return data;
  },
});
