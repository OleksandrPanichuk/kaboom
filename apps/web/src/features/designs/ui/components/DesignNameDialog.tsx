import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { errorMessage } from "@/features/auth";
import { DESIGN_NAME_MAX_LENGTH } from "@/features/designs/constants";

interface DesignNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  defaultName: string;
  pending: boolean;
  error: unknown;
  onSubmit: (name: string) => void;
}

export function DesignNameDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  pendingLabel,
  defaultName,
  pending,
  error,
  onSubmit,
}: DesignNameDialogProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = String(new FormData(event.currentTarget).get("name")).trim();

    if (name) onSubmit(name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="design-name">Name</FieldLabel>
            <Input
              id="design-name"
              name="name"
              defaultValue={defaultName}
              maxLength={DESIGN_NAME_MAX_LENGTH}
              placeholder="URL shortener"
              autoComplete="off"
              required
              aria-invalid={error ? true : undefined}
            />
            {error ? <FieldError>{errorMessage(error)}</FieldError> : null}
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
