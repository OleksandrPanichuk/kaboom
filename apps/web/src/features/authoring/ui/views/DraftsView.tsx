import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { PencilLine, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import { createDraftMutation, draftsQuery } from "@/features/authoring/api";
import { DraftsList } from "@/features/authoring/ui/components";

interface DraftsViewProps {
  onOpen: (draftId: string) => void;
}

export function DraftsView({ onOpen }: DraftsViewProps) {
  const { data: drafts } = useSuspenseQuery(draftsQuery);
  const create = useMutation(createDraftMutation);

  return (
    <div className="flex-1 bg-background px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              My problems
            </h1>
            <p className="text-sm leading-6 text-muted-foreground text-pretty sm:text-base">
              Write a problem for others to solve. A moderator reviews it before
              it is published, and solving it earns points like any other.
            </p>
          </div>
          <Button
            disabled={create.isPending}
            onClick={() =>
              create.mutate(null, { onSuccess: (draft) => onOpen(draft.id) })
            }
          >
            <Plus aria-hidden="true" />
            {create.isPending ? "Starting…" : "New problem"}
          </Button>
        </div>
        {create.error ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(create.error)}
          </p>
        ) : null}
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <span className="grid size-10 place-items-center rounded-xl bg-interactive-surface text-interactive-foreground">
              <PencilLine aria-hidden="true" className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground text-pretty">
              No problems yet. Start a blank one, or fork a published problem
              from its page to build on it.
            </p>
          </div>
        ) : (
          <DraftsList drafts={drafts} />
        )}
      </div>
    </div>
  );
}
