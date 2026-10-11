import type { PublishCheckModel } from "@repo/api-client";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";

import {
  DRAFT_SECTIONS,
  type DraftSectionId,
} from "@/features/authoring/constants";
import { formatPath, sectionOf } from "@/features/authoring/utils";

type Issue = PublishCheckModel["issues"][number];

interface IssuesStripProps {
  issues: readonly Issue[];
  checked: PublishCheckModel | null;
  onJump: (issue: Issue) => void;
}

const SHOWN = 3;

const labelOf = (id: DraftSectionId) =>
  DRAFT_SECTIONS.find((section) => section.id === id)?.label ?? id;

export function IssuesStrip({ issues, checked, onJump }: IssuesStripProps) {
  const [all, setAll] = useState(false);

  if (checked?.ok) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-xl border border-success-border bg-success-surface px-4 py-2.5 text-sm text-success-foreground"
      >
        <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
        Passes the publish check. It is ready to send for review.
      </p>
    );
  }

  if (issues.length === 0) return null;

  const shown = all ? issues : issues.slice(0, SHOWN);

  return (
    <div
      role="region"
      aria-label="Issues"
      className="flex flex-col gap-2 rounded-xl border border-warning-border bg-warning-surface px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4"
    >
      <p className="flex items-center gap-2 font-medium text-warning-foreground">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        {issues.length} {issues.length === 1 ? "thing" : "things"} to fix before
        review
      </p>
      <ul className="flex min-w-0 flex-col gap-1.5 sm:contents">
        {shown.map((issue, index) => (
          <li key={`${formatPath(issue.path)}-${index}`} className="min-w-0">
            <button
              type="button"
              title={`${labelOf(sectionOf(issue.path))} · ${formatPath(issue.path) || "content"}`}
              onClick={() => onJump(issue)}
              className="max-w-full truncate text-left text-interactive-foreground underline-offset-2 hover:underline sm:max-w-80"
            >
              {issue.message}
            </button>
          </li>
        ))}
      </ul>
      {issues.length > SHOWN ? (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((current) => !current)}
          className="self-start font-medium text-warning-foreground underline-offset-2 hover:underline sm:self-auto"
        >
          {all ? "Show fewer" : `and ${issues.length - SHOWN} more`}
        </button>
      ) : null}
    </div>
  );
}
