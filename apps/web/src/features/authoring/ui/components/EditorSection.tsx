import { cn } from "cn";
import type { ReactNode } from "react";

interface EditorSectionProps {
  id: string;
  title: string;
  description?: string;
  issues?: number;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function EditorSection({
  id,
  title,
  description,
  issues = 0,
  actions,
  className,
  children,
}: EditorSectionProps) {
  return (
    <section
      id={`section-${id}`}
      data-section={id}
      aria-labelledby={`section-${id}-title`}
      tabIndex={-1}
      className={cn(
        "flex min-w-0 scroll-mt-40 flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-card outline-none sm:p-6",
        issues > 0 && "border-warning-border",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2
              id={`section-${id}-title`}
              className="text-lg font-semibold tracking-[-0.015em]"
            >
              {title}
            </h2>
            {issues > 0 ? (
              <span className="shrink-0 rounded-full bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning-foreground tabular-nums">
                {issues} {issues === 1 ? "issue" : "issues"}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="max-w-prose text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
