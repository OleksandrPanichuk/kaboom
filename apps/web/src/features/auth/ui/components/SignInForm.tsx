import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { signInMutation } from "@/features/auth/api";
import { errorMessage, isChallengeRequired } from "@/features/auth/utils";

import { CaptchaChallenge } from "./CaptchaChallenge";

interface SignInFormProps {
  onSignedIn: () => void;
}

export function SignInForm({ onSignedIn }: SignInFormProps) {
  const signIn = useMutation(signInMutation);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    signIn.mutate(
      {
        email: String(form.get("email")),
        password: String(form.get("password")),
      },
      { onSuccess: onSignedIn },
    );
  };

  return (
    <form onSubmit={submit} noValidate={false}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </Field>
        {isChallengeRequired(signIn.error) && signIn.variables ? (
          <CaptchaChallenge
            onSolved={(challengeToken) =>
              signIn.mutate(
                { ...signIn.variables, challengeToken },
                { onSuccess: onSignedIn },
              )
            }
          />
        ) : signIn.isError ? (
          <FieldError>{errorMessage(signIn.error)}</FieldError>
        ) : null}
        <Button type="submit" disabled={signIn.isPending}>
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
