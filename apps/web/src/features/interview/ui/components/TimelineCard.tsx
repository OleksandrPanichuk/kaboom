import { CircleCheck, CircleX, Crosshair, Flag, Flame } from "lucide-react";
import type { ReactNode } from "react";

import type { DurableEvent } from "@/features/interview/typedefs";
import { phaseLabel } from "@/features/interview/utils";

interface TimelineCardProps {
  event: DurableEvent;
}

interface RunPayload {
  drillId?: string;
  requestedBy?: string;
  run?: {
    revision: number;
    findings: Array<{ message: string }>;
    summary?: { minAvailability?: number; maxP99?: number };
  };
}

const Card = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <li className="flex gap-2 self-center rounded-xl border border-black/[0.06] bg-zinc-50 px-3 py-2 text-xs leading-5 text-muted-foreground">
    <span className="mt-0.5 shrink-0">{icon}</span>
    <div className="min-w-0 text-pretty">{children}</div>
  </li>
);

export function TimelineCard({ event }: TimelineCardProps) {
  if (event.type === "phase") {
    return (
      <Card icon={<Flag aria-hidden="true" className="size-3.5" />}>
        Moved on to {phaseLabel(String(event.payload.phase))}.
      </Card>
    );
  }

  if (event.type === "highlight") {
    const ids = (event.payload.nodeIds as string[] | undefined) ?? [];

    return (
      <Card icon={<Crosshair aria-hidden="true" className="size-3.5" />}>
        Pointed at {ids.join(", ")}
        {event.payload.note ? `: ${String(event.payload.note)}` : "."}
      </Card>
    );
  }

  if (event.type === "status") {
    return (
      <Card icon={<Flag aria-hidden="true" className="size-3.5" />}>
        The interview ended. Your review will appear here once it is ready.
      </Card>
    );
  }

  if (event.type === "simulation") {
    const { drillId, requestedBy, run } = event.payload as RunPayload;
    const findings = run?.findings ?? [];
    const clean = findings.length === 0;

    return (
      <Card
        icon={
          requestedBy === "interviewer" ? (
            <Flame aria-hidden="true" className="size-3.5 text-orange-600" />
          ) : clean ? (
            <CircleCheck
              aria-hidden="true"
              className="size-3.5 text-emerald-600"
            />
          ) : (
            <CircleX aria-hidden="true" className="size-3.5 text-red-600" />
          )
        }
      >
        <p className="font-medium text-foreground">
          {requestedBy === "interviewer"
            ? `The interviewer ran ${drillId ? `the “${drillId}” drill` : "a drill"} on revision ${run?.revision ?? "?"}.`
            : `You ran a simulation on revision ${run?.revision ?? "?"}.`}
        </p>
        {clean ? (
          <p>Nothing went wrong.</p>
        ) : (
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {findings.slice(0, 4).map((finding, index) => (
              <li key={index}>{finding.message}</li>
            ))}
          </ul>
        )}
      </Card>
    );
  }

  return null;
}
