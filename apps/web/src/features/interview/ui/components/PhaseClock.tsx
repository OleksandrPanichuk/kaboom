import type { InterviewModel } from "@repo/api-client";
import { cn } from "cn";
import { Timer } from "lucide-react";

import { useNow } from "@/features/interview/hooks";
import { formatDuration, phaseLabel } from "@/features/interview/utils";

interface PhaseClockProps {
  interview: InterviewModel;
}

export function PhaseClock({ interview }: PhaseClockProps) {
  const now = useNow();
  const plan = interview.problem.phases.find(
    (phase) => phase.id === interview.phase,
  );
  const used = now - new Date(interview.phaseStartedAt).getTime();
  const over = plan !== undefined && used > plan.minutes * 60_000;

  if (interview.status !== "active") {
    return (
      <span className="hidden text-xs text-muted-foreground md:inline">
        Ended
      </span>
    );
  }

  return (
    <span
      aria-label={`${phaseLabel(interview.phase)}, ${formatDuration(used)} of ${plan?.minutes ?? "?"} minutes`}
      className={cn(
        "hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs tabular-nums md:inline-flex",
        over ? "bg-amber-50 text-amber-800" : "text-muted-foreground",
      )}
    >
      <Timer aria-hidden="true" className="size-3.5" />
      {phaseLabel(interview.phase)} · {formatDuration(used)} /{" "}
      {plan ? `${plan.minutes}:00` : "?"}
    </span>
  );
}
