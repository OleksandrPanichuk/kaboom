import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { MAX_COMMENT_LENGTH } from "@/features/discussion/constants";

interface CommentComposerProps {
  initialBody?: string;
  initialSpoiler?: boolean;
  placeholder: string;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  autoFocus?: boolean;
  onSubmit: (body: string, spoiler: boolean, reset: () => void) => void;
  onCancel?: () => void;
}

export function CommentComposer({
  initialBody = "",
  initialSpoiler = false,
  placeholder,
  submitLabel,
  pending,
  error,
  autoFocus,
  onSubmit,
  onCancel,
}: CommentComposerProps) {
  const id = useId();
  const [body, setBody] = useState(initialBody);
  const [spoiler, setSpoiler] = useState(initialSpoiler);
  const trimmed = body.trim();
  const tooLong = body.length > MAX_COMMENT_LENGTH;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();

        if (trimmed === "" || tooLong) return;

        onSubmit(trimmed, spoiler, () => {
          setBody("");
          setSpoiler(false);
        });
      }}
    >
      <Textarea
        aria-label={placeholder}
        placeholder={placeholder}
        value={body}
        autoFocus={autoFocus}
        aria-invalid={tooLong || undefined}
        className="max-h-60 min-h-20 text-sm"
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.currentTarget.form?.requestSubmit();
          }
          if (event.key === "Escape" && onCancel) onCancel();
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Field orientation="horizontal" className="w-auto">
          <Switch
            id={`${id}-spoiler`}
            checked={spoiler}
            onCheckedChange={setSpoiler}
          />
          <FieldLabel htmlFor={`${id}-spoiler`} className="text-xs">
            Spoiler
          </FieldLabel>
        </Field>
        <div className="flex items-center gap-2">
          {body.length > MAX_COMMENT_LENGTH * 0.8 ? (
            <span
              className={
                tooLong
                  ? "text-xs text-danger-foreground tabular-nums"
                  : "text-xs text-muted-foreground tabular-nums"
              }
            >
              {body.length}/{MAX_COMMENT_LENGTH}
            </span>
          ) : null}
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            size="sm"
            disabled={pending || trimmed === "" || tooLong}
          >
            {pending ? "Posting…" : submitLabel}
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger-foreground">
          {error}
        </p>
      ) : null}
    </form>
  );
}
