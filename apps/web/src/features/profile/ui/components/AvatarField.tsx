import type { MyProfileModel } from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";
import { type ChangeEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import {
  removeAvatarMutation,
  uploadAvatarMutation,
} from "@/features/profile/api";
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from "@/features/profile/constants";

import { UserAvatar } from "./UserAvatar";

interface AvatarFieldProps {
  profile: MyProfileModel;
}

const tooLarge = "An avatar may be at most 1 MB.";
const wrongType = "Choose a PNG, JPEG or WebP image.";

export function AvatarField({ profile }: AvatarFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useMutation(uploadAvatarMutation);
  const remove = useMutation(removeAvatarMutation);
  const [problem, setProblem] = useState<string | null>(null);
  const busy = upload.isPending || remove.isPending;
  const failure = upload.error ?? remove.error;

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setProblem(wrongType);

      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setProblem(tooLarge);

      return;
    }

    setProblem(null);
    remove.reset();
    upload.mutate(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar
        name={profile.displayName}
        url={profile.avatarUrl}
        size="xl"
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {upload.isPending
              ? "Uploading…"
              : profile.avatarUrl
                ? "Change avatar"
                : "Upload avatar"}
          </Button>
          {profile.avatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                upload.reset();
                remove.mutate();
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          PNG, JPEG or WebP, up to 1 MB. Anyone can see it.
        </p>
        {problem || failure ? (
          <p role="alert" className="text-sm text-destructive">
            {problem ?? errorMessage(failure)}
          </p>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={choose}
      />
    </div>
  );
}
