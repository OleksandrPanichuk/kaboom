import type { BillingOfferModel } from "@repo/api-client";
import { ShieldCheck } from "lucide-react";

import { describeOffer } from "@/features/billing/utils";

interface OrderSummaryProps {
  offer: BillingOfferModel;
}

export function OrderSummary({ offer }: OrderSummaryProps) {
  const { name, price, cadence } = describeOffer(offer);
  const recurring = offer.type === "recurring";

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        Your order
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{name}</span>
        <span className="text-right">
          <span className="text-xl font-semibold tracking-[-0.02em]">
            {price}
          </span>{" "}
          <span className="text-sm text-muted-foreground">{cadence}</span>
        </span>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {recurring
          ? "Renews every month on the day you subscribe. Cancel any time from your billing settings and keep Pro until the period ends."
          : "One payment. Pro stays on your account for good. A monthly subscription you have ends as soon as this is paid, without a refund for the current month."}
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        {offer.taxBehavior === "exclusive"
          ? "Tax, where it applies, is added at payment."
          : "Prices include tax where it applies."}
      </p>
      <p className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
        Card details go straight to our payment provider and never reach our
        servers.
      </p>
    </aside>
  );
}
