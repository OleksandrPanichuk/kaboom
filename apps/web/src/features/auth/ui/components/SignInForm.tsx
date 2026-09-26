import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { signInMutation } from "../../api/auth.mutations";
import { errorMessage } from "../../utils/errorMessage";

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
        </Field>
        {signIn.isError ? (
          <FieldError>{errorMessage(signIn.error)}</FieldError>
        ) : null}
        <Button type="submit" disabled={signIn.isPending}>
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
