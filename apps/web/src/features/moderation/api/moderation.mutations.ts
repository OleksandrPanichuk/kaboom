import { mutationOptions, type QueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export type Difficulty = "easy" | "medium" | "hard";

const refresh = (client: QueryClient) => {
  client.removeQueries({ queryKey: ["problem-reviews", "list"] });

  return Promise.all([
    client.invalidateQueries({ queryKey: ["problem-reviews"] }),
    client.invalidateQueries({ queryKey: ["problems", "list"] }),
  ]);
};

export const approveReviewMutation = mutationOptions({
  mutationKey: ["problem-reviews", "approve"],
  mutationFn: async ({
    id,
    difficulty,
  }: {
    id: string;
    difficulty: Difficulty | null;
  }) =>
    unwrap(
      await api.api
        .problemReviews(id)
        .approve.post(difficulty ? { difficulty } : {}),
    ),
  onSuccess: (_review, _variables, _result, { client }) => refresh(client),
});

export const rejectReviewMutation = mutationOptions({
  mutationKey: ["problem-reviews", "reject"],
  mutationFn: async ({ id, feedback }: { id: string; feedback: string }) =>
    unwrap(await api.api.problemReviews(id).reject.post({ feedback })),
  onSuccess: (_review, _variables, _result, { client }) => refresh(client),
});
