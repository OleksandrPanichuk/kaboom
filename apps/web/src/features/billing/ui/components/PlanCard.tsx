import { cn } from "cn";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface PlanCardProps {
  title: string;
  price: string;
  cadence: string;
  description: string;
  features: readonly string[];
  action: ReactNode;
  badge?: string;
  highlighted?: boolean;
}

export function PlanCard({
  title,
  price,
  cadence,
  description,
  features,
  action,
  badge,
  highlighted = false,
}: PlanCardProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "relative flex min-w-0 flex-col gap-5 rounded-2xl border bg-card p-5 shadow-card sm:p-6",
        highlighted
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
          {badge ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-[-0.04em]">
          {price}
        </span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
      </p>
      <ul className="flex flex-1 flex-col gap-2.5 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-success-foreground"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col">{action}</div>
    </section>
  );
}
