import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const myProfileQuery = queryOptions({
  queryKey: ["profiles", "me"],
  queryFn: async () => unwrap(await api.api.profiles.me.get()),
});

export const profileQuery = (handle: string) =>
  queryOptions({
    queryKey: ["profiles", "handle", handle.toLowerCase()],
    queryFn: async () => unwrap(await api.api.profiles(handle).get()),
  });
