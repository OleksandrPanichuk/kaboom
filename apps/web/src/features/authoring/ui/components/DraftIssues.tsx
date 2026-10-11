import type { PublishCheckModel } from "@repo/api-client";
import { CircleCheck, TriangleAlert } from "lucide-react";

import {
  DRAFT_SECTIONS,
  type DraftSectionId,
} from "@/features/authoring/constants";
import { formatPath, sectionOf } from "@/features/authoring/utils";

interface DraftIssuesProps {
  issues: PublishCheckModel["issues"];
  checked: PublishCheckModel | null;
  onJump: (section: DraftSectionId) => void;
}

const labelOf = (id: DraftSectionId) =>
  DRAFT_SECTIONS.find((section) => section.id === id)?.label ?? id;

export function DraftIssues({ issues, checked, onJump }: DraftIssuesProps) {
  if (checked?.ok) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-success-surface px-3 py-2.5 text-sm text-success-foreground">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Passes the publish check. It is ready to send for review.
      </p>
    );
  }

  if (issues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-pretty">
        It parses. Run the check to see whether it can be published: the
        reference must score 100 on every drill and rubric item.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {issues.map((issue, index) => {
        const section = sectionOf(issue.path);

        return (
          <li key={`${formatPath(issue.path)}-${index}`}>
            <button
              type="button"
              onClick={() => onJump(section)}
              className="flex w-full items-start gap-2 rounded-xl border border-warning-border bg-warning-surface/70 px-3 py-2 text-left text-sm hover:bg-warning-surface"
            >
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-warning"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-pretty">{issue.message}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {labelOf(section)} · {formatPath(issue.path) || "content"}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
