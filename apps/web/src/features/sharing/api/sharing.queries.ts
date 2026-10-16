import { queryOptions } from "@tanstack/react-query";

import type { ShareSubject } from "@/features/sharing/typedefs";
import { api, ApiRequestError, unwrap } from "@/lib/api";

export const myShareKey = (subject: ShareSubject, subjectId: string) =>
  ["shares", "mine", subject, subjectId] as const;

export const myShareQuery = (subject: ShareSubject, subjectId: string) =>
  queryOptions({
    queryKey: myShareKey(subject, subjectId),
    queryFn: async () => {
      try {
        return unwrap(
          await api.api.shares.mine.get({ query: { subject, subjectId } }),
        );
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
  });

export const sharedQuery = (token: string) =>
  queryOptions({
    queryKey: ["shared", token],
    queryFn: async () => unwrap(await api.api.shared(token).get()),
  });
