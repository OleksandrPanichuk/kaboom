import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/Button";
import { FieldError, FieldGroup } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

import { resetPasswordMutation } from "../../api/auth.mutations";
import { errorMessage } from "../../utils/errorMessage";
import { PasswordFields, readPasswordPair } from "./PasswordFields";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const reset = useMutation(resetPasswordMutation);
  const [mismatch, setMismatch] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const pair = readPasswordPair(new FormData(event.currentTarget));

    if (!pair.ok) {
      setMismatch(pair.message);

      return;
    }

    setMismatch(null);
    reset.mutate({ token, password: pair.password });
  };

  if (reset.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border bg-muted/40 p-4 text-sm">
          Your password is changed, and every device that was signed in has been
          signed out.
        </p>
        <Link to="/sign-in" className={cn(buttonVariants())}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <PasswordFields idPrefix="reset" />
        {mismatch ? <FieldError>{mismatch}</FieldError> : null}
        {reset.isError ? (
          <FieldError>{errorMessage(reset.error)}</FieldError>
        ) : null}
        <Button type="submit" disabled={reset.isPending}>
          {reset.isPending ? "Saving…" : "Set the new password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
