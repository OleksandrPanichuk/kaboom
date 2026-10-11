import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const draftsQuery = queryOptions({
  queryKey: ["problem-drafts"],
  queryFn: async () => unwrap(await api.api.problemDrafts.get()),
});

export const draftQuery = (draftId: string) =>
  queryOptions({
    queryKey: ["problem-drafts", draftId],
    queryFn: async () => unwrap(await api.api.problemDrafts(draftId).get()),
    staleTime: 0,
  });
