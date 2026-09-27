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
import {
  errorMessage,
  updateProfileMutation,
  useCurrentUser,
} from "@/features/auth";

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
        <FieldLabel htmlFor="profile-name">Name</FieldLabel>
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
        <FieldDescription>
          {update.isSuccess
            ? "Saved."
            : "Shown in the app and in the emails we send you."}
        </FieldDescription>
        {update.isError ? (
          <FieldError>{errorMessage(update.error)}</FieldError>
        ) : null}
      </Field>
    </form>
  );
}
