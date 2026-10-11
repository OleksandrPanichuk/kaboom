import { cn } from "cn";
import type { ReactNode } from "react";

interface EditorSectionProps {
  id: string;
  title: string;
  description?: string;
  issues?: number;
  children: ReactNode;
}

export function EditorSection({
  id,
  title,
  description,
  issues = 0,
  children,
}: EditorSectionProps) {
  return (
    <section
      id={`section-${id}`}
      aria-labelledby={`section-${id}-title`}
      tabIndex={-1}
      className={cn(
        "flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card outline-none sm:p-5",
        issues > 0 && "border-warning-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`section-${id}-title`} className="font-semibold">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {issues > 0 ? (
          <span className="shrink-0 rounded-full bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning-foreground tabular-nums">
            {issues} {issues === 1 ? "issue" : "issues"}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
