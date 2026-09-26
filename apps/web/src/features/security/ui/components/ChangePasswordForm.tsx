import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordFields, readPasswordPair } from "@/features/auth";
import { changePasswordMutation } from "@/features/security/api";
import { securityErrorMessage } from "@/features/security/utils";

export function ChangePasswordForm() {
  const change = useMutation(changePasswordMutation);
  const [mismatch, setMismatch] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const target = event.currentTarget;
    const form = new FormData(target);
    const pair = readPasswordPair(form);

    if (!pair.ok) {
      setMismatch(pair.message);

      return;
    }

    setMismatch(null);
    change.mutate(
      {
        currentPassword: String(form.get("currentPassword")),
        password: pair.password,
      },
      { onSuccess: () => target.reset() },
    );
  };

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="current-password">Current password</FieldLabel>
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <PasswordFields idPrefix="change" />
        {mismatch ? <FieldError>{mismatch}</FieldError> : null}
        {change.isError ? (
          <FieldError>
            {securityErrorMessage(change.error, {
              INVALID_CREDENTIALS: "Your current password is not right.",
            })}
          </FieldError>
        ) : null}
        {change.isSuccess ? (
          <FieldDescription>
            Password changed. Every other device has been signed out.
          </FieldDescription>
        ) : null}
        <div>
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? "Saving…" : "Change password"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
