import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { captchaHeaders } from "../utils/captcha";
import { currentUserQuery } from "./auth.queries";

export interface WithChallenge {
  challengeToken?: string;
}

export interface SignInVariables extends WithChallenge {
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
  mutationFn: async ({ challengeToken, ...body }: SignInVariables) =>
    unwrap(
      await api.api.auth.signIn.post(body, {
        headers: await captchaHeaders("sign_in", challengeToken),
      }),
    ),
  onSuccess: (_session, _variables, _result, { client }) =>
    client.fetchQuery({ ...currentUserQuery, staleTime: 0 }),
});

export const signUpMutation = mutationOptions({
  mutationKey: ["auth", "sign-up"],
  mutationFn: async ({ challengeToken, ...body }: SignUpVariables) =>
    unwrap(
      await api.api.auth.signUp.post(body, {
        headers: await captchaHeaders("sign_up", challengeToken),
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

export interface SendResetPasswordTokenVariables extends WithChallenge {
  email: string;
}

export interface ResetPasswordVariables {
  token: string;
  password: string;
}

export const sendResetPasswordTokenMutation = mutationOptions({
  mutationKey: ["auth", "send-reset-password-token"],
  mutationFn: async ({
    challengeToken,
    ...body
  }: SendResetPasswordTokenVariables) =>
    unwrap(
      await api.api.auth.sendResetPasswordToken.post(body, {
        headers: await captchaHeaders("password_reset", challengeToken),
      }),
    ),
});

export const resetPasswordMutation = mutationOptions({
  mutationKey: ["auth", "reset-password"],
  mutationFn: async (variables: ResetPasswordVariables) =>
    unwrap(await api.api.auth.resetPassword.post(variables)),
  onSuccess: (_result, _variables, _mutateResult, { client }) => {
    client.clear();
    client.setQueryData(currentUserQuery.queryKey, null);
  },
});

export interface TokenVariables {
  token: string;
}

export interface SendEmailVerificationTokenVariables extends WithChallenge {
  email: string;
}

export const verifyEmailMutation = mutationOptions({
  mutationKey: ["auth", "verify-email"],
  mutationFn: async (variables: TokenVariables) =>
    unwrap(await api.api.auth.verifyEmail.post(variables)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: currentUserQuery.queryKey }),
});

export const sendEmailVerificationTokenMutation = mutationOptions({
  mutationKey: ["auth", "send-email-verification-token"],
  mutationFn: async ({
    challengeToken,
    ...body
  }: SendEmailVerificationTokenVariables) =>
    unwrap(
      await api.api.auth.sendEmailVerificationToken.post(body, {
        headers: await captchaHeaders("email_verification", challengeToken),
      }),
    ),
});

export const confirmEmailChangeMutation = mutationOptions({
  mutationKey: ["auth", "confirm-email-change"],
  mutationFn: async (variables: TokenVariables) =>
    unwrap(await api.api.auth.confirmEmailChange.post(variables)),
  onSuccess: (_result, _variables, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: currentUserQuery.queryKey }),
});
