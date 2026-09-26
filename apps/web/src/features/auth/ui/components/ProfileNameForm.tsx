import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { updateProfileMutation } from "@/features/auth/api";
import { useCurrentUser } from "@/features/auth/hooks";
import { errorMessage } from "@/features/auth/utils";

export function ProfileNameForm() {
  const user = useCurrentUser();
  const update = useMutation(updateProfileMutation);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = String(new FormData(event.currentTarget).get("name")).trim();

    if (name && name !== user.name) update.mutate({ name });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="profile-name">Your name</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="profile-name"
            name="name"
            defaultValue={user.name}
            key={user.name}
            autoComplete="name"
            required
          />
          <Button type="submit" variant="secondary" disabled={update.isPending}>
            Save
          </Button>
        </div>
        {update.isSuccess ? <FieldDescription>Saved.</FieldDescription> : null}
        {update.isError ? (
          <FieldError>{errorMessage(update.error)}</FieldError>
        ) : null}
      </Field>
    </form>
  );
}
