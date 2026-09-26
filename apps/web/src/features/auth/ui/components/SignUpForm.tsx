import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { signUpMutation } from "../../api/auth.mutations";
import { PASSWORD_MIN_LENGTH } from "../../constants/auth.constants";
import { errorMessage } from "../../utils/errorMessage";

interface SignUpFormProps {
  onSignedUp: () => void;
}

export function SignUpForm({ onSignedUp }: SignUpFormProps) {
  const signUp = useMutation(signUpMutation);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    signUp.mutate(
      {
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      },
      { onSuccess: onSignedUp },
    );
  };

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
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
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
          <FieldDescription>
            At least {PASSWORD_MIN_LENGTH} characters.
          </FieldDescription>
        </Field>
        {signUp.isError ? (
          <FieldError>{errorMessage(signUp.error)}</FieldError>
        ) : null}
        <Button type="submit" disabled={signUp.isPending}>
          {signUp.isPending ? "Creating your account…" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}
