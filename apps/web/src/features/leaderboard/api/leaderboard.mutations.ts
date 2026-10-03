import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export const saveLeaderboardProfileMutation = mutationOptions({
  mutationKey: ["leaderboard", "profile"],
  mutationFn: async (body: { handle: string; visible: boolean }) =>
    unwrap(await api.api.leaderboard.me.put(body)),
  onSuccess: (_profile, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: ["leaderboard"] }),
});
