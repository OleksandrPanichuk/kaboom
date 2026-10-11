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
        "flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] outline-none sm:p-5",
        issues > 0 && "border-amber-300",
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
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 tabular-nums">
            {issues} {issues === 1 ? "issue" : "issues"}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
