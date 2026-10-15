import type { BillingOfferModel } from "@repo/api-client";
import { Check, Lock, Sparkles } from "lucide-react";

import { PRO_FEATURES } from "@/features/billing/constants";
import { describeOffer } from "@/features/billing/utils";

interface OrderSummaryProps {
  offer: BillingOfferModel;
}

export function OrderSummary({ offer }: OrderSummaryProps) {
  const { name, price, cadence } = describeOffer(offer);
  const recurring = offer.type === "recurring";
  const taxIncluded = offer.taxBehavior !== "exclusive";

  return (
    <aside
      aria-label="Order summary"
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:sticky lg:top-16"
    >
      <div className="flex items-center gap-3 border-b border-border p-4 sm:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Sparkles aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold">{name}</span>
          <span className="text-xs text-muted-foreground">
            {recurring ? "Monthly subscription" : "One-time payment"}
          </span>
        </div>
      </div>
      <dl className="flex flex-col gap-2.5 p-4 text-sm sm:p-5">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{name}</dt>
          <dd className="tabular-nums">{price}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="text-muted-foreground">
            {taxIncluded ? "Included" : "Added at payment"}
          </dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-3.5">
          <dt className="font-semibold">Due today</dt>
          <dd className="text-xl font-semibold tracking-[-0.02em] tabular-nums">
            {price}
          </dd>
        </div>
        <p className="text-xs leading-5 text-muted-foreground text-pretty">
          {recurring
            ? `Then ${price} ${cadence}, on the same day each month. Cancel any time and keep Pro until the period ends.`
            : "No renewals. A monthly subscription you have ends once this is paid, without a refund for the current month."}
        </p>
      </dl>
      <ul className="flex flex-col gap-2 border-t border-border bg-muted/40 p-4 text-sm sm:p-5">
        {PRO_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-success-foreground"
            />
            {feature}
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
        <Lock aria-hidden="true" className="size-3.5 shrink-0" />
        Card details go straight to our payment provider.
      </p>
    </aside>
  );
}
