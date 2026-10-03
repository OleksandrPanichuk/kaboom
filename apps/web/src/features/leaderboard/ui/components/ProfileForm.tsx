import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { errorMessage } from "@/features/auth";
import { saveLeaderboardProfileMutation } from "@/features/leaderboard/api";

interface ProfileFormProps {
  handle: string | null;
  visible: boolean;
  onDone?: () => void;
}

const HANDLE = /^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])$/;

export function ProfileForm({ handle, visible, onDone }: ProfileFormProps) {
  const id = useId();
  const save = useMutation(saveLeaderboardProfileMutation);
  const [draft, setDraft] = useState(handle ?? "");
  const [shown, setShown] = useState(handle === null ? true : visible);
  const valid = HANDLE.test(draft);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (!valid) return;

        save.mutate(
          { handle: draft, visible: shown },
          { onSuccess: () => onDone?.() },
        );
      }}
    >
      <Field>
        <FieldLabel htmlFor={`${id}-handle`}>Handle</FieldLabel>
        <Input
          id={`${id}-handle`}
          value={draft}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={draft !== "" && !valid}
          onChange={(event) => setDraft(event.target.value.toLowerCase())}
          placeholder="ada-lovelace"
        />
        <FieldDescription>
          3 to 20 lowercase letters, digits, hyphens or underscores. Only this
          name appears on the board, never your name or email.
        </FieldDescription>
      </Field>
      <Field orientation="horizontal">
        <Switch
          id={`${id}-visible`}
          checked={shown}
          onCheckedChange={setShown}
        />
        <FieldLabel htmlFor={`${id}-visible`}>
          Show me on the leaderboard
        </FieldLabel>
      </Field>
      {save.error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(save.error)}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid || save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        {onDone ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
