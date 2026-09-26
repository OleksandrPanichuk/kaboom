import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
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
import { useCurrentUser } from "@/features/auth";
import { deleteAccountMutation } from "@/features/security/api";
import { securityErrorMessage } from "@/features/security/utils";

import { SettingsSection } from "./SettingsSection";

interface DeleteAccountSectionProps {
  hasPassword: boolean;
  onDeleted: () => void;
}

export function DeleteAccountSection({
  hasPassword,
  onDeleted,
}: DeleteAccountSectionProps) {
  const user = useCurrentUser();
  const remove = useMutation(deleteAccountMutation);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const password = form.get("password");

    remove.mutate(
      {
        email: String(form.get("email")),
        ...(typeof password === "string" && password ? { password } : {}),
      },
      { onSuccess: onDeleted },
    );
  };

  return (
    <SettingsSection
      title="Delete account"
      description="Your designs, interviews and reviews go with it. This cannot be undone."
      icon={Trash2}
      tone="danger"
    >
      <form onSubmit={submit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="delete-email">
              Type {user.email} to confirm
            </FieldLabel>
            <Input
              id="delete-email"
              name="email"
              type="email"
              autoComplete="off"
              required
            />
          </Field>
          {hasPassword ? (
            <Field>
              <FieldLabel htmlFor="delete-password">Your password</FieldLabel>
              <Input
                id="delete-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
              <FieldDescription>To make sure it is you.</FieldDescription>
            </Field>
          ) : null}
          {remove.isError ? (
            <FieldError>{securityErrorMessage(remove.error)}</FieldError>
          ) : null}
          <div>
            <Button
              type="submit"
              variant="destructive"
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete my account"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </SettingsSection>
  );
}
