import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const emailPreferencesQuery = queryOptions({
  queryKey: ["email-preferences"],
  queryFn: async () => unwrap(await api.api.emailPreferences.me.get()),
});
