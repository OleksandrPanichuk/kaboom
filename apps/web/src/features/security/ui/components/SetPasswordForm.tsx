import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FieldError, FieldGroup } from "@/components/ui/Field";
import { PasswordFields, readPasswordPair } from "@/features/auth";
import { setPasswordMutation } from "@/features/security/api";
import { securityErrorMessage } from "@/features/security/utils";

export function SetPasswordForm() {
  const set = useMutation(setPasswordMutation);
  const [mismatch, setMismatch] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const pair = readPasswordPair(new FormData(event.currentTarget));

    if (!pair.ok) {
      setMismatch(pair.message);

      return;
    }

    setMismatch(null);
    set.mutate({ password: pair.password });
  };

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <PasswordFields idPrefix="set" label="Password" />
        {mismatch ? <FieldError>{mismatch}</FieldError> : null}
        {set.isError ? (
          <FieldError>{securityErrorMessage(set.error)}</FieldError>
        ) : null}
        <div>
          <Button type="submit" disabled={set.isPending}>
            {set.isPending ? "Saving…" : "Add a password"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
