import type { MyProfileModel } from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { errorMessage } from "@/features/auth";
import { updateMyProfileMutation } from "@/features/profile/api";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MAX_LINKS,
} from "@/features/profile/constants";
import {
  filledLinks,
  type ProfileDraft,
  profileDraftErrors,
} from "@/features/profile/utils";

interface ProfileDetailsFormProps {
  profile: MyProfileModel;
}

const draftOf = (profile: MyProfileModel): ProfileDraft => ({
  handle: profile.handle,
  displayName: profile.displayName,
  bio: profile.bio,
  links: Array.from(
    { length: MAX_LINKS },
    (_, index) => profile.links[index] ?? "",
  ),
  visible: profile.visible,
});

export function ProfileDetailsForm({ profile }: ProfileDetailsFormProps) {
  const id = useId();
  const save = useMutation(updateMyProfileMutation);
  const [draft, setDraft] = useState(() => draftOf(profile));
  const [touched, setTouched] = useState(false);
  const errors = profileDraftErrors(draft);
  const shown = touched ? errors : {};
  const invalid = Object.keys(errors).length > 0;

  const change = (patch: Partial<ProfileDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    save.reset();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);

    if (invalid) return;

    save.mutate({
      handle: draft.handle,
      displayName: draft.displayName.trim(),
      bio: draft.bio.trim(),
      links: filledLinks(draft.links),
      visible: draft.visible,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={shown.displayName ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>Display name</FieldLabel>
          <Input
            id={`${id}-name`}
            value={draft.displayName}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            aria-invalid={shown.displayName ? true : undefined}
            onChange={(event) => change({ displayName: event.target.value })}
          />
          {shown.displayName ? (
            <FieldError>{shown.displayName}</FieldError>
          ) : (
            <FieldDescription>
              On the leaderboard and your profile.
            </FieldDescription>
          )}
        </Field>
        <Field data-invalid={shown.handle ? true : undefined}>
          <FieldLabel htmlFor={`${id}-handle`}>Handle</FieldLabel>
          <Input
            id={`${id}-handle`}
            value={draft.handle}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={shown.handle ? true : undefined}
            onChange={(event) =>
              change({ handle: event.target.value.toLowerCase() })
            }
          />
          {shown.handle ? (
            <FieldError>{shown.handle}</FieldError>
          ) : (
            <FieldDescription>
              Your profile's address: /u/{draft.handle || "…"}
            </FieldDescription>
          )}
        </Field>
      </div>
      <Field data-invalid={shown.bio ? true : undefined}>
        <FieldLabel htmlFor={`${id}-bio`}>Bio</FieldLabel>
        <Textarea
          id={`${id}-bio`}
          value={draft.bio}
          rows={3}
          aria-invalid={shown.bio ? true : undefined}
          onChange={(event) => change({ bio: event.target.value })}
          placeholder="What you build, what you're learning."
        />
        {shown.bio ? (
          <FieldError>{shown.bio}</FieldError>
        ) : (
          <FieldDescription>
            {draft.bio.trim().length} / {BIO_MAX_LENGTH}
          </FieldDescription>
        )}
      </Field>
      <Field data-invalid={shown.links ? true : undefined}>
        <FieldLabel htmlFor={`${id}-link-0`}>Links</FieldLabel>
        <div className="flex flex-col gap-2">
          {draft.links.map((link, index) => (
            <Input
              key={index}
              id={`${id}-link-${index}`}
              type="url"
              inputMode="url"
              value={link}
              aria-label={index === 0 ? undefined : `Link ${index + 1}`}
              aria-invalid={shown.links ? true : undefined}
              placeholder="https://github.com/you"
              onChange={(event) =>
                change({
                  links: draft.links.map((item, at) =>
                    at === index ? event.target.value : item,
                  ),
                })
              }
            />
          ))}
        </div>
        {shown.links ? <FieldError>{shown.links}</FieldError> : null}
      </Field>
      <Field orientation="horizontal">
        <Switch
          id={`${id}-visible`}
          checked={draft.visible}
          onCheckedChange={(visible) => change({ visible })}
        />
        <div className="flex flex-col gap-0.5">
          <FieldLabel htmlFor={`${id}-visible`}>Public profile</FieldLabel>
          <FieldDescription>
            Off hides your profile from others and takes you off the
            leaderboard. Your email is never shown.
          </FieldDescription>
        </div>
      </Field>
      {save.error ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(save.error)}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save profile"}
        </Button>
        {save.isSuccess ? (
          <span role="status" className="text-sm text-muted-foreground">
            Saved.
          </span>
        ) : null}
      </div>
    </form>
  );
}
