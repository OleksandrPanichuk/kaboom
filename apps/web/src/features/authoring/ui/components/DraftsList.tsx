import type { ProblemDraftSummaryModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";

import { DraftStatusBadge } from "./DraftStatusBadge";

interface DraftsListProps {
  drafts: ProblemDraftSummaryModel[];
}

const edited = (at: string) =>
  new Date(at).toLocaleDateString("en", { day: "numeric", month: "short" });

export function DraftsList({ drafts }: DraftsListProps) {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border border-border bg-card">
      {drafts.map((draft) => (
        <li key={draft.id}>
          <Link
            to="/authoring/$draftId"
            params={{ draftId: draft.id }}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium">{draft.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {draft.problemSlug
                  ? `/problems/${draft.problemSlug}`
                  : (draft.slug ?? "No slug yet")}{" "}
                · edited {edited(draft.updatedAt)}
              </span>
            </span>
            <DraftStatusBadge status={draft.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
