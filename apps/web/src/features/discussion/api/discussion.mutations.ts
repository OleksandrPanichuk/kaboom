import { mutationOptions, type QueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { commentsKey, ratingQuery } from "./discussion.queries";

export interface PostCommentVariables {
  slug: string;
  body: string;
  spoiler: boolean;
  parentId?: string;
}

export interface EditCommentVariables {
  slug: string;
  id: string;
  body?: string;
  spoiler?: boolean;
}

export interface RemoveCommentVariables {
  slug: string;
  id: string;
}

export interface RateVariables {
  slug: string;
  stars: number | null;
}

const refreshProblem = (client: QueryClient, slug: string) =>
  Promise.all([
    client.invalidateQueries({ queryKey: commentsKey(slug) }),
    client.invalidateQueries({ queryKey: ["problems", "detail", slug] }),
    client.invalidateQueries({ queryKey: ["problems", "list"] }),
  ]);

export const postCommentMutation = mutationOptions({
  mutationKey: ["problems", "comments", "post"],
  mutationFn: async ({ slug, body, spoiler, parentId }: PostCommentVariables) =>
    unwrap(
      await api.api
        .problems(slug)
        .comments.post({ body, spoiler, ...(parentId ? { parentId } : {}) }),
    ),
  onSuccess: (_comment, { slug }, _mutateResult, { client }) =>
    refreshProblem(client, slug),
});

export const editCommentMutation = mutationOptions({
  mutationKey: ["problems", "comments", "edit"],
  mutationFn: async ({ slug, id, ...patch }: EditCommentVariables) =>
    unwrap(await api.api.problems(slug).comments(id).patch(patch)),
  onSuccess: (_comment, { slug }, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: commentsKey(slug) }),
});

export const removeCommentMutation = mutationOptions({
  mutationKey: ["problems", "comments", "remove"],
  mutationFn: async ({ slug, id }: RemoveCommentVariables) =>
    unwrap(await api.api.problems(slug).comments(id).delete()),
  onSuccess: (_result, { slug }, _mutateResult, { client }) =>
    refreshProblem(client, slug),
});

export const rateProblemMutation = mutationOptions({
  mutationKey: ["problems", "rating", "rate"],
  mutationFn: async ({ slug, stars }: RateVariables) =>
    stars === null
      ? unwrap(await api.api.problems(slug).rating.delete())
      : unwrap(await api.api.problems(slug).rating.put({ stars })),
  onSuccess: (rating, { slug }, _mutateResult, { client }) => {
    client.setQueryData(ratingQuery(slug).queryKey, rating);

    return Promise.all([
      client.invalidateQueries({ queryKey: ["problems", "detail", slug] }),
      client.invalidateQueries({ queryKey: ["problems", "list"] }),
    ]);
  },
});
