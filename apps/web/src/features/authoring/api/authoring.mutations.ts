import type { ProblemDraftModel } from "@repo/api-client";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { draftQuery, draftsQuery } from "./authoring.queries";

export type DraftPart = "baseline" | "reference";

const stored = (client: QueryClient, draft: ProblemDraftModel) => {
  client.setQueryData(draftQuery(draft.id).queryKey, draft);

  return client.invalidateQueries({
    queryKey: draftsQuery.queryKey,
    exact: true,
  });
};

export const createDraftMutation = mutationOptions({
  mutationKey: ["problem-drafts", "create"],
  mutationFn: async (forkOf: string | null) =>
    unwrap(await api.api.problemDrafts.post(forkOf ? { forkOf } : {})),
  onSuccess: (draft, _variables, _result, { client }) => stored(client, draft),
});

export const saveDraftMutation = mutationOptions({
  mutationKey: ["problem-drafts", "save"],
  mutationFn: async ({ id, content }: { id: string; content: unknown }) =>
    unwrap(await api.api.problemDrafts(id).put({ content })),
  onSuccess: (draft, _variables, _result, { client }) => stored(client, draft),
});

export const deleteDraftMutation = mutationOptions({
  mutationKey: ["problem-drafts", "delete"],
  mutationFn: async (id: string) =>
    unwrap(await api.api.problemDrafts(id).delete()),
  onSuccess: (_result, id, _context, { client }) => {
    client.removeQueries({ queryKey: draftQuery(id).queryKey });

    return client.invalidateQueries({ queryKey: draftsQuery.queryKey });
  },
});

export const checkDraftMutation = mutationOptions({
  mutationKey: ["problem-drafts", "check"],
  mutationFn: async (id: string) =>
    unwrap(await api.api.problemDrafts(id).check.post()),
});

export const submitDraftMutation = mutationOptions({
  mutationKey: ["problem-drafts", "submit"],
  mutationFn: async (id: string) =>
    unwrap(await api.api.problemDrafts(id).submit.post()),
  onSuccess: (draft, _variables, _result, { client }) => stored(client, draft),
});

export const withdrawReviewMutation = mutationOptions({
  mutationKey: ["problem-drafts", "withdraw"],
  mutationFn: async (id: string) =>
    unwrap(await api.api.problemDrafts(id).withdraw.post()),
  onSuccess: (draft, _variables, _result, { client }) => stored(client, draft),
});

export const openDraftDesignMutation = mutationOptions({
  mutationKey: ["problem-drafts", "design"],
  mutationFn: async ({ id, part }: { id: string; part: DraftPart }) =>
    unwrap(await api.api.problemDrafts(id).designs(part).post()),
});
