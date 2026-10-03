import type { Finding } from "@repo/design";
import { cn } from "cn";
import { CircleCheck, Crosshair, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatClock } from "@/features/simulation/utils";

const TITLES: Record<Finding["kind"], string> = {
  saturated: "Saturated",
  errors: "Failing requests",
  throttled: "Turning requests away",
  "backlog-growing": "Falling behind",
  "slo-breach": "SLO missed",
  "rollout-stalled": "Rollout stuck",
  "rolled-back": "Rolled back",
  "untested-deploy": "Deploys untested code",
  "unscanned-deploy": "Deploys unscanned code",
  "blocked-path": "Cannot connect",
  "exposed-store": "Data open to the internet",
  "exposed-service": "Service open to the internet",
  "open-store": "Data open to the whole VPC",
};

interface FindingsListProps {
  findings: Finding[];
  stepSeconds: number;
  onShow: (finding: Finding) => void;
}

export function FindingsList({
  findings,
  stepSeconds,
  onShow,
}: FindingsListProps) {
  if (findings.length === 0) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
        <CircleCheck
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-emerald-600"
        />
        <p className="leading-5">
          The design holds up for the whole run: nothing saturates, fails or
          falls behind, and every client meets its SLO.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {findings.map((finding, index) => (
        <li
          key={`${finding.kind}-${finding.target.id ?? "graph"}-${index}`}
          className={cn(
            "flex gap-2.5 rounded-xl border p-3 text-sm",
            finding.kind === "slo-breach" || finding.kind === "errors"
              ? "border-destructive/20 bg-destructive/[0.03]"
              : "border-amber-200 bg-amber-50/70",
          )}
        >
          <TriangleAlert
            aria-hidden="true"
            className={cn(
              "mt-0.5 size-4 shrink-0",
              finding.kind === "slo-breach" || finding.kind === "errors"
                ? "text-destructive"
                : "text-amber-600",
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="flex items-baseline justify-between gap-2 font-medium">
              <span>{TITLES[finding.kind]}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                from {formatClock(finding.atStep * stepSeconds)}
              </span>
            </p>
            <p className="leading-5 text-pretty">{finding.message}</p>
            {finding.target.id ? (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 self-start"
                onClick={() => onShow(finding)}
              >
                <Crosshair aria-hidden="true" />
                Show on canvas
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
