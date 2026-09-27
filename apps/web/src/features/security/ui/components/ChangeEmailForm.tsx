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
import { changeEmailMutation } from "@/features/security/api";
import { securityErrorMessage } from "@/features/security/utils";

interface ChangeEmailFormProps {
  hasPassword: boolean;
}

export function ChangeEmailForm({ hasPassword }: ChangeEmailFormProps) {
  const change = useMutation(changeEmailMutation);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const password = form.get("password");

    change.mutate({
      email: String(form.get("email")),
      ...(typeof password === "string" && password ? { password } : {}),
    });
  };

  if (change.isSuccess) {
    return (
      <p className="rounded-lg border bg-muted/40 p-4 text-sm">
        We sent a confirmation link to{" "}
        <span className="font-medium">{change.variables.email}</span>. Your
        account moves there once you open it.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="new-email">New email</FieldLabel>
          <Input
            id="new-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        {hasPassword ? (
          <Field>
            <FieldLabel htmlFor="email-password">Your password</FieldLabel>
            <Input
              id="email-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <FieldDescription>To make sure it is you asking.</FieldDescription>
          </Field>
        ) : null}
        {change.isError ? (
          <FieldError>
            {securityErrorMessage(change.error, {
              INVALID_CREDENTIALS: "That password is not right.",
            })}
          </FieldError>
        ) : null}
        <div>
          <Button type="submit" variant="secondary" disabled={change.isPending}>
            {change.isPending ? "Sending…" : "Send a confirmation link"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
