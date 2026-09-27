import type { DesignOp } from "@repo/design";
import { mutationOptions } from "@tanstack/react-query";

import type { DesignTransport } from "@/features/designs";
import { api, unwrap } from "@/lib/api";

import { interviewQuery, interviewsQuery } from "./interview.queries";

export const startInterviewMutation = mutationOptions({
  mutationKey: ["interviews", "start"],
  mutationFn: async ({ slug }: { slug: string }) =>
    unwrap(await api.api.interviews.post({ slug })),
  onSuccess: (interview, _variables, _mutateResult, { client }) => {
    client.setQueryData(interviewQuery(interview.id).queryKey, interview);

    return client.invalidateQueries({ queryKey: interviewsQuery.queryKey });
  },
});

export const sendInterviewMessageMutation = mutationOptions({
  mutationKey: ["interviews", "message"],
  mutationFn: async ({ id, body }: { id: string; body: string }) =>
    unwrap(await api.api.interviews(id).messages.post({ body })),
  onSuccess: (_message, { id }, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: interviewQuery(id).queryKey }),
});

export const submitInterviewMutation = mutationOptions({
  mutationKey: ["interviews", "submit"],
  mutationFn: async ({ id }: { id: string }) =>
    unwrap(await api.api.interviews(id).submit.post({})),
  onSuccess: (_status, { id }, _mutateResult, { client }) =>
    Promise.all([
      client.invalidateQueries({ queryKey: interviewQuery(id).queryKey }),
      client.invalidateQueries({ queryKey: interviewsQuery.queryKey }),
    ]),
});

export const interruptInterviewer = async (id: string) =>
  unwrap(await api.api.interviews(id).interrupt.post({}));

export const reportDesignSettled = async (id: string) =>
  unwrap(
    await api.api.interviews(id).triggers.post({ kind: "design-settled" }),
  );

export const interviewTransport = (id: string): DesignTransport => ({
  sendOps: async (baseRevision: number, ops: DesignOp[]) =>
    unwrap(await api.api.interviews(id).ops.post({ baseRevision, ops })),
  saveLayout: async (layout) =>
    unwrap(await api.api.interviews(id).layout.put({ layout })),
});
