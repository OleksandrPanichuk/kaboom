import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { captchaHeaders } from "../utils/captcha";
import { currentUserQuery } from "./auth.queries";

export interface SignInVariables {
  email: string;
  password: string;
}

export interface SignUpVariables extends SignInVariables {
  name: string;
}

export interface UpdateProfileVariables {
  name: string;
}

export const signInMutation = mutationOptions({
  mutationKey: ["auth", "sign-in"],
  mutationFn: async (variables: SignInVariables) =>
    unwrap(
      await api.api.auth.signIn.post(variables, {
        headers: await captchaHeaders("sign_in"),
      }),
    ),
  onSuccess: (_session, _variables, _result, { client }) =>
    client.fetchQuery({ ...currentUserQuery, staleTime: 0 }),
});

export const signUpMutation = mutationOptions({
  mutationKey: ["auth", "sign-up"],
  mutationFn: async (variables: SignUpVariables) =>
    unwrap(
      await api.api.auth.signUp.post(variables, {
        headers: await captchaHeaders("sign_up"),
      }),
    ),
  onSuccess: (_session, _variables, _result, { client }) =>
    client.fetchQuery({ ...currentUserQuery, staleTime: 0 }),
});

export const signOutMutation = mutationOptions({
  mutationKey: ["auth", "sign-out"],
  mutationFn: async () => unwrap(await api.api.auth.signOut.post(undefined)),
  onSettled: (_result, _error, _variables, _mutateResult, { client }) => {
    client.clear();
    client.setQueryData(currentUserQuery.queryKey, null);
  },
});

export const updateProfileMutation = mutationOptions({
  mutationKey: ["auth", "update-profile"],
  mutationFn: async (variables: UpdateProfileVariables) =>
    unwrap(await api.api.users.me.patch(variables)),
  onSuccess: (user, _variables, _result, { client }) => {
    client.setQueryData(currentUserQuery.queryKey, user);
  },
});
