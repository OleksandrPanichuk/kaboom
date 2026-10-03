import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const activityQuery = queryOptions({
  queryKey: ["progress", "activity"],
  queryFn: async () => unwrap(await api.api.progress.activity.get()),
});

export const skillHistoryQuery = queryOptions({
  queryKey: ["skills", "me", "history"],
  queryFn: async () => unwrap(await api.api.skills.me.history.get()),
});
