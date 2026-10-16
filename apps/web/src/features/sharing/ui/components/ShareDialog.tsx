import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Link2, Link2Off } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { errorMessage } from "@/features/auth";
import {
  createShareMutation,
  myShareQuery,
  revokeShareMutation,
} from "@/features/sharing/api";
import type { ShareSubject } from "@/features/sharing/typedefs";

interface ShareDialogProps {
  subject: ShareSubject;
  subjectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DESCRIPTIONS: Record<ShareSubject, string> = {
  design:
    "Anyone with the link sees this design as it stands, read-only, without signing in. Your edits show up there as you make them.",
  interview:
    "Anyone with the link sees the review and your final design, without signing in. The transcript stays private.",
};

const COPIED_MS = 2_000;

export function ShareDialog({
  subject,
  subjectId,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const share = useQuery({
    ...myShareQuery(subject, subjectId),
    enabled: open,
  });
  const create = useMutation(createShareMutation);
  const revoke = useMutation(revokeShareMutation);
  const [copied, setCopied] = useState(false);
  const error = create.error ?? revoke.error ?? share.error;

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Share {subject === "design" ? "this design" : "this review"}
          </DialogTitle>
          <DialogDescription>{DESCRIPTIONS[subject]}</DialogDescription>
        </DialogHeader>
        {share.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading…
          </p>
        ) : share.data ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                readOnly
                aria-label="Shared link"
                value={share.data.url}
                className="min-w-0 font-mono text-xs"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                className="shrink-0"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(share.data!.url)
                    .then(() => setCopied(true));
                }}
              >
                {copied ? (
                  <Check aria-hidden="true" data-icon="inline-start" />
                ) : (
                  <Copy aria-hidden="true" data-icon="inline-start" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <img
              src={share.data.imageUrl}
              alt="How the link looks when it is posted"
              width={1200}
              height={630}
              className="aspect-[1200/630] w-full rounded-lg border bg-muted object-cover"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                href={share.data.url}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ExternalLink aria-hidden="true" data-icon="inline-start" />
                Open
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={revoke.isPending}
                onClick={() =>
                  revoke.mutate({
                    subject,
                    subjectId,
                    token: share.data!.token,
                  })
                }
              >
                <Link2Off aria-hidden="true" data-icon="inline-start" />
                {revoke.isPending ? "Turning off…" : "Turn off link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Nothing is shared yet. Turning the link off later stops it working
              for good.
            </p>
            <Button
              disabled={create.isPending}
              onClick={() => create.mutate({ subject, subjectId })}
            >
              <Link2 aria-hidden="true" data-icon="inline-start" />
              {create.isPending ? "Creating…" : "Create a public link"}
            </Button>
          </div>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(error)}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
