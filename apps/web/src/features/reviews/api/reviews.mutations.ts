import { mutationOptions } from "@tanstack/react-query";

import { interviewQuery, interviewsQuery } from "@/features/interview";
import { api, unwrap } from "@/lib/api";

export const retryReviewMutation = mutationOptions({
  mutationKey: ["interviews", "review", "retry"],
  mutationFn: async ({ interviewId }: { interviewId: string }) =>
    unwrap(await api.api.interviews(interviewId).review.retry.post({})),
  onSuccess: (_status, { interviewId }, _mutateResult, { client }) =>
    Promise.all([
      client.invalidateQueries({
        queryKey: interviewQuery(interviewId).queryKey,
      }),
      client.invalidateQueries({ queryKey: interviewsQuery.queryKey }),
    ]),
});
