import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const reviewQuery = (interviewId: string) =>
  queryOptions({
    queryKey: ["interviews", "review", interviewId],
    queryFn: async () =>
      unwrap(await api.api.interviews(interviewId).review.get()),
  });
