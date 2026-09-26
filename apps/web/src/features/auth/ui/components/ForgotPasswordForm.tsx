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

import { sendResetPasswordTokenMutation } from "../../api/auth.mutations";
import { errorMessage } from "../../utils/errorMessage";
import { isChallengeRequired } from "../../utils/isChallengeRequired";
import { CaptchaChallenge } from "./CaptchaChallenge";

export function ForgotPasswordForm() {
  const send = useMutation(sendResetPasswordTokenMutation);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    send.mutate({
      email: String(new FormData(event.currentTarget).get("email")),
    });
  };

  if (send.isSuccess) {
    return (
      <p className="rounded-lg border bg-muted/40 p-4 text-sm">
        If an account uses{" "}
        <span className="font-medium">{send.variables.email}</span>, a link to
        reset its password is on its way. It works for an hour.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
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
          <FieldDescription>
            We will send a link to set a new password.
          </FieldDescription>
        </Field>
        {isChallengeRequired(send.error) && send.variables ? (
          <CaptchaChallenge
            onSolved={(challengeToken) =>
              send.mutate({ ...send.variables, challengeToken })
            }
          />
        ) : send.isError ? (
          <FieldError>{errorMessage(send.error)}</FieldError>
        ) : null}
        <Button type="submit" disabled={send.isPending}>
          {send.isPending ? "Sending…" : "Send the link"}
        </Button>
      </FieldGroup>
    </form>
  );
}
