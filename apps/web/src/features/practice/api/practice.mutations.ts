import type { Track } from "@repo/design";
import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { practicePlanKey } from "./practice.queries";

export const startPracticePlanMutation = mutationOptions({
  mutationKey: ["practice-plan", "start"],
  mutationFn: async (track: Track) =>
    unwrap(await api.api.practicePlans.post({ track })),
  onSuccess: (plan, _track, _result, { client }) => {
    client.setQueryData(practicePlanKey, plan);
  },
});

export const dropPracticePlanMutation = mutationOptions({
  mutationKey: ["practice-plan", "drop"],
  mutationFn: async () => unwrap(await api.api.practicePlans.current.delete()),
  onSuccess: (_result, _variables, _context, { client }) => {
    client.setQueryData(practicePlanKey, null);
  },
});
