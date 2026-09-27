import type { LintHit } from "@repo/design";
import { cn } from "cn";
import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

interface LintCalloutProps {
  hit: LintHit;
  title?: string;
  action?: ReactNode;
}

export function LintCallout({ hit, title, action }: LintCalloutProps) {
  const warning = hit.severity === "warning";
  const Icon = warning ? TriangleAlert : Info;

  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-xl border p-3 text-sm",
        warning
          ? "border-amber-200 bg-amber-50/70 text-amber-950"
          : "border-black/[0.07] bg-zinc-50 text-foreground",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          warning ? "text-amber-600" : "text-zinc-500",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <p className="leading-5 text-pretty">{hit.message}</p>
        {action}
      </div>
    </div>
  );
}
