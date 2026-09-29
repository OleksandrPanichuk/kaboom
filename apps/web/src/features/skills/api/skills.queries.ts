import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const skillsQuery = queryOptions({
  queryKey: ["skills", "me"],
  queryFn: async () => unwrap(await api.api.skills.me.get()),
});
