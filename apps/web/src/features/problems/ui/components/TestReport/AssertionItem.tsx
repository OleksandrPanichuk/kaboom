import type { AssertionModel } from "@repo/api-client";
import { cn } from "cn";
import { Check, Crosshair, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatClock } from "@/features/simulation";

interface AssertionItemProps {
  assertion: AssertionModel;
  labelOf: (nodeId: string) => string;
  onShow: (() => void) | null;
}

export function AssertionItem({
  assertion,
  labelOf,
  onShow,
}: AssertionItemProps) {
  const places = assertion.nodeIds.map(labelOf);
  const where = [
    assertion.at !== null ? `at ${formatClock(assertion.at)}` : null,
    places.length > 0 ? places.join(", ") : null,
  ].filter((part) => part !== null);

  return (
    <li className="flex min-w-0 gap-2">
      {assertion.passed ? (
        <Check
          aria-label="Held"
          className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
        />
      ) : (
        <X
          aria-label="Broken"
          className="mt-0.5 size-3.5 shrink-0 text-red-600"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="min-w-0 text-sm text-pretty">{assertion.label}</p>
          <p className="shrink-0 text-xs tabular-nums">
            <span
              className={cn(
                "font-medium",
                assertion.passed ? "text-foreground" : "text-red-700",
              )}
            >
              {assertion.actual}
            </span>
            <span className="text-muted-foreground">
              {" "}
              / expected {assertion.expected}
            </span>
          </p>
        </div>
        {assertion.message ? (
          <p className="text-xs leading-5 text-muted-foreground text-pretty">
            {assertion.message}
          </p>
        ) : null}
        {where.length > 0 || onShow ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {where.length > 0 ? (
              <span className="min-w-0 truncate">{where.join(" · ")}</span>
            ) : null}
            {onShow ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={onShow}
              >
                <Crosshair aria-hidden="true" className="size-3" />
                Show on canvas
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
