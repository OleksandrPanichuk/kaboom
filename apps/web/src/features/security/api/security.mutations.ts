import { mutationOptions } from "@tanstack/react-query";

import { currentUserQuery, type OAuthProvider } from "@/features/auth";
import { api, unwrap } from "@/lib/api";

import { connectedAccountsQuery, sessionsQuery } from "./security.queries";

export interface ChangePasswordVariables {
  currentPassword: string;
  password: string;
}

export interface SetPasswordVariables {
  password: string;
}

export interface ChangeEmailVariables {
  email: string;
  password?: string;
}

export interface DeleteAccountVariables {
  email: string;
  password?: string;
}

export const changePasswordMutation = mutationOptions({
  mutationKey: ["security", "change-password"],
  mutationFn: async (variables: ChangePasswordVariables) =>
    unwrap(await api.api.auth.changePassword.post(variables)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: sessionsQuery.queryKey }),
});

export const setPasswordMutation = mutationOptions({
  mutationKey: ["security", "set-password"],
  mutationFn: async (variables: SetPasswordVariables) =>
    unwrap(await api.api.auth.setPassword.post(variables)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: connectedAccountsQuery.queryKey }),
});

export const changeEmailMutation = mutationOptions({
  mutationKey: ["security", "change-email"],
  mutationFn: async (variables: ChangeEmailVariables) =>
    unwrap(await api.api.auth.changeEmail.post(variables)),
});

export const unlinkProviderMutation = mutationOptions({
  mutationKey: ["security", "unlink-provider"],
  mutationFn: async (provider: OAuthProvider) =>
    unwrap(await api.api.auth.oauth(provider).unlink.post(undefined)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: connectedAccountsQuery.queryKey }),
});

export const revokeSessionMutation = mutationOptions({
  mutationKey: ["security", "revoke-session"],
  mutationFn: async (id: string) =>
    unwrap(await api.api.sessions(id).delete(undefined)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: sessionsQuery.queryKey }),
});

export const revokeOtherSessionsMutation = mutationOptions({
  mutationKey: ["security", "revoke-other-sessions"],
  mutationFn: async () =>
    unwrap(await api.api.sessions.others.delete(undefined)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: sessionsQuery.queryKey }),
});

export const deleteAccountMutation = mutationOptions({
  mutationKey: ["security", "delete-account"],
  mutationFn: async (variables: DeleteAccountVariables) =>
    unwrap(await api.api.users.me.delete(variables)),
  onSuccess: (_result, _variables, _mutateResult, { client }) => {
    client.clear();
    client.setQueryData(currentUserQuery.queryKey, null);
  },
});
