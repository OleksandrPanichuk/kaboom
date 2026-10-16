import type { EmailPreferencesModel } from "@repo/api-client";
import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { emailPreferencesQuery } from "./notifications.queries";

export const updateEmailPreferencesMutation = mutationOptions({
  mutationKey: ["email-preferences", "update"],
  mutationFn: async (patch: Partial<EmailPreferencesModel>) =>
    unwrap(await api.api.emailPreferences.me.patch(patch)),
  onMutate: async (patch, { client }) => {
    await client.cancelQueries({ queryKey: emailPreferencesQuery.queryKey });

    const previous = client.getQueryData(emailPreferencesQuery.queryKey);

    client.setQueryData(emailPreferencesQuery.queryKey, (current) =>
      current ? { ...current, ...patch } : current,
    );

    return { previous };
  },
  onError: (_error, _patch, context, { client }) => {
    if (context?.previous) {
      client.setQueryData(emailPreferencesQuery.queryKey, context.previous);
    }
  },
  onSuccess: (preferences, _patch, _context, { client }) => {
    client.setQueryData(emailPreferencesQuery.queryKey, preferences);
  },
});
