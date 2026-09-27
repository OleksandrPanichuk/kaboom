import type { DesignGraph, EvaluationStep, Slo } from "@repo/design";
import { cn } from "cn";

import { formatMs, formatRate } from "@/features/simulation/utils";

interface ClientSummaryProps {
  graph: DesignGraph;
  step: EvaluationStep | undefined;
  slo: Slo;
}

const availabilityText = (value: number) =>
  `${(Math.floor(value * 10_000) / 100).toFixed(2)}%`;

export function ClientSummary({ graph, step, slo }: ClientSummaryProps) {
  const clients = graph.nodes.filter((node) => node.kind === "client");

  if (clients.length === 0 || !step) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Add a client to send traffic through the design.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {clients.map((client) => {
        const numbers = step.clients[client.id];

        if (!numbers) return null;

        const slow = numbers.p99 > slo.p99Ms;
        const failing = numbers.availability < slo.availability;

        return (
          <li
            key={client.id}
            className="flex flex-col gap-1.5 rounded-xl border border-black/[0.07] p-3"
          >
            <p className="truncate text-sm font-medium">
              {client.label || client.id}
            </p>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Sends</dt>
                <dd className="font-medium tabular-nums">
                  {formatRate(numbers.emitted)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Served</dt>
                <dd
                  className={cn(
                    "font-medium tabular-nums",
                    failing && "text-destructive",
                  )}
                >
                  {availabilityText(numbers.availability)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">p99</dt>
                <dd
                  className={cn(
                    "font-medium tabular-nums",
                    slow && "text-destructive",
                  )}
                >
                  {formatMs(numbers.p99)}
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
