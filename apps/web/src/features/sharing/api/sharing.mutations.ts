import { mutationOptions } from "@tanstack/react-query";

import type { ShareSubject } from "@/features/sharing/typedefs";
import { api, unwrap } from "@/lib/api";

import { myShareKey } from "./sharing.queries";

export interface ShareVariables {
  subject: ShareSubject;
  subjectId: string;
}

export interface RevokeShareVariables extends ShareVariables {
  token: string;
}

export const createShareMutation = mutationOptions({
  mutationKey: ["shares", "create"],
  mutationFn: async ({ subject, subjectId }: ShareVariables) =>
    unwrap(await api.api.shares.post({ subject, subjectId })),
  onSuccess: (share, { subject, subjectId }, _mutateResult, { client }) => {
    client.setQueryData(myShareKey(subject, subjectId), share);
  },
});

export const revokeShareMutation = mutationOptions({
  mutationKey: ["shares", "revoke"],
  mutationFn: async ({ token }: RevokeShareVariables) =>
    unwrap(await api.api.shares(token).delete()),
  onSuccess: (_result, { subject, subjectId }, _mutateResult, { client }) => {
    client.setQueryData(myShareKey(subject, subjectId), null);
  },
});
