import type { MyProfileModel } from "@repo/api-client";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { myProfileQuery } from "./profile.queries";

export interface ProfilePatch {
  handle?: string;
  displayName?: string;
  bio?: string;
  links?: string[];
  visible?: boolean;
}

const saved = (client: QueryClient, profile: MyProfileModel) => {
  client.setQueryData(myProfileQuery.queryKey, profile);

  return Promise.all([
    client.invalidateQueries({ queryKey: ["profiles", "handle"] }),
    client.invalidateQueries({ queryKey: ["leaderboard"] }),
  ]);
};

export const updateMyProfileMutation = mutationOptions({
  mutationKey: ["profiles", "me", "update"],
  mutationFn: async (patch: ProfilePatch) =>
    unwrap(await api.api.profiles.me.patch(patch)),
  onSuccess: (profile, _variables, _result, { client }) =>
    saved(client, profile),
});

export const uploadAvatarMutation = mutationOptions({
  mutationKey: ["profiles", "me", "avatar"],
  mutationFn: async (file: File) =>
    unwrap(await api.api.profiles.me.avatar.put({ file })),
  onSuccess: (profile, _variables, _result, { client }) =>
    saved(client, profile),
});

export const removeAvatarMutation = mutationOptions({
  mutationKey: ["profiles", "me", "avatar", "remove"],
  mutationFn: async () => unwrap(await api.api.profiles.me.avatar.delete()),
  onSuccess: (profile, _variables, _result, { client }) =>
    saved(client, profile),
});
