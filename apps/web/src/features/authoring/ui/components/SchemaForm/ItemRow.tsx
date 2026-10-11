import { cn } from "cn";
import { ChevronRight, Trash2 } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { ItemSummary } from "@/features/authoring/utils";
import { startsWith } from "@/features/authoring/utils";

import { useSchemaForm } from "./SchemaForm.context";

interface ItemRowProps {
  path: ReadonlyArray<string | number>;
  noun: string;
  index: number;
  summary: ItemSummary;
  defaultOpen: boolean;
  removable: boolean;
  onRemove: () => void;
  children: ReactNode;
}

export function ItemRow({
  path,
  noun,
  index,
  summary,
  defaultOpen,
  removable,
  onRemove,
  children,
}: ItemRowProps) {
  const bodyId = useId();
  const { issues, reveal } = useSchemaForm();
  const [toggled, setToggled] = useState({ open: defaultOpen, at: 0 });
  const problems = issues.filter((issue) =>
    startsWith(issue.path, path),
  ).length;
  const name = summary.title ?? `${noun} ${index + 1}`;

  const open =
    toggled.open ||
    (reveal !== null &&
      reveal.at > toggled.at &&
      startsWith(reveal.path, path));

  return (
    <div
      data-path={path.join(".")}
      className={cn(
        "rounded-xl border bg-card",
        problems > 0 ? "border-warning-border" : "border-border",
        open && "shadow-card",
      )}
    >
      <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setToggled({ open: !open, at: Date.now() })}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          {summary.kind ? (
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-subtle-foreground">
              {summary.kind}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 @2xl:flex-row @2xl:items-baseline @2xl:gap-2.5">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="min-w-0 truncate font-medium">
                {summary.title ?? (summary.kind ? null : name)}
              </span>
              {summary.id ? (
                <span className="hidden min-w-0 shrink truncate font-mono text-xs text-muted-foreground @md:inline">
                  {summary.id}
                </span>
              ) : null}
            </span>
            {summary.details.length > 0 ? (
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {summary.details.join(" · ")}
              </span>
            ) : null}
          </span>
        </button>
        {problems > 0 ? (
          <span className="shrink-0 rounded-full bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning-foreground tabular-nums">
            {problems}
            <span className="sr-only">
              {problems === 1 ? " issue" : " issues"}
            </span>
          </span>
        ) : null}
        {summary.aside ? (
          <span className="shrink-0 px-1 text-sm font-medium tabular-nums">
            {summary.aside}
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${name.toLowerCase()}`}
          disabled={!removable}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      {open ? (
        <div id={bodyId} className="border-t border-border px-3 py-4 sm:px-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}
