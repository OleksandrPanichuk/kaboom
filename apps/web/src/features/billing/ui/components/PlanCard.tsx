import { cn } from "cn";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface PlanCardProps {
  title: string;
  tagline: string;
  price: string;
  cadence: string;
  note: string;
  features: readonly string[];
  action: ReactNode;
  control?: ReactNode;
  badge?: string;
  highlighted?: boolean;
}

export function PlanCard({
  title,
  tagline,
  price,
  cadence,
  note,
  features,
  action,
  control,
  badge,
  highlighted = false,
}: PlanCardProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-card",
        highlighted ? "border-primary/40" : "border-border",
      )}
    >
      {highlighted ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/[0.07] to-transparent"
        />
      ) : null}
      <div className="relative flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">
              {title}
            </h2>
            {badge ? (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{tagline}</p>
        </div>
        {control}
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tracking-[-0.04em] tabular-nums">
              {price}
            </span>
            <span className="text-sm text-muted-foreground">{cadence}</span>
          </p>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
        {action}
        <ul className="flex flex-col gap-2.5 border-t border-border pt-5 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-success-surface text-success-foreground">
                <Check aria-hidden="true" className="size-3" />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
