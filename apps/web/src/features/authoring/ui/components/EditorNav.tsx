import { cn } from "cn";
import { Check } from "lucide-react";

import type { SectionState } from "@/features/authoring/utils";

export interface EditorNavItem {
  id: string;
  label: string;
  state: SectionState;
  issues: number;
}

interface EditorNavProps {
  items: readonly EditorNavItem[];
  active: string | null;
  review: { label: string; detail: string | null } | null;
  onJump: (id: string) => void;
}

function Status({ item }: { item: EditorNavItem }) {
  if (item.issues > 0) {
    return (
      <span className="rounded-full bg-warning-surface px-1.5 text-xs font-medium text-warning-foreground tabular-nums">
        {item.issues}
        <span className="sr-only">
          {item.issues === 1 ? " issue" : " issues"}
        </span>
      </span>
    );
  }

  switch (item.state.kind) {
    case "done":
      return <Check aria-label="complete" className="size-3.5 text-success" />;
    case "empty":
      return (
        <span
          aria-label="not filled in"
          className="size-1.5 rounded-full border border-muted-foreground"
        />
      );
    case "count":
      return (
        <span className="text-xs text-muted-foreground tabular-nums">
          {item.state.count}
        </span>
      );
    case "label":
      return (
        <span className="text-xs text-muted-foreground">
          {item.state.label}
        </span>
      );
  }
}

export function EditorNav({ items, active, review, onJump }: EditorNavProps) {
  return (
    <>
      <nav
        aria-label="Sections"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden"
      >
        {items.map((item) => (
          <a
            key={item.id}
            href={`#section-${item.id}`}
            aria-current={active === item.id ? "true" : undefined}
            onClick={(event) => {
              event.preventDefault();
              onJump(item.id);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-subtle-foreground aria-current:border-interactive-border aria-current:bg-interactive-surface aria-current:text-interactive-foreground"
          >
            {item.label}
            <Status item={item} />
          </a>
        ))}
      </nav>
      <nav
        aria-label="Sections"
        className="sticky top-40 hidden flex-col gap-4 self-start lg:flex"
      >
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#section-${item.id}`}
                aria-current={active === item.id ? "true" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onJump(item.id);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm text-subtle-foreground transition-colors hover:bg-card hover:text-foreground",
                  "aria-current:bg-card aria-current:font-medium aria-current:text-foreground aria-current:shadow-card",
                )}
              >
                <span className="truncate">{item.label}</span>
                <Status item={item} />
              </a>
            </li>
          ))}
        </ul>
        {review ? (
          <a
            href="#section-reviews"
            onClick={(event) => {
              event.preventDefault();
              onJump("reviews");
            }}
            className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm hover:border-interactive-border"
          >
            <span className="text-xs font-medium text-muted-foreground">
              Review
            </span>
            <span className="font-medium">{review.label}</span>
            {review.detail ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {review.detail}
              </span>
            ) : null}
          </a>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
            Not sent for review yet
          </p>
        )}
      </nav>
    </>
  );
}
