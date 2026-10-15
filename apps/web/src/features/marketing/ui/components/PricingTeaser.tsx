import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight, Check } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import {
  describeOffer,
  FREE_FEATURES,
  offersQuery,
  PRO_FEATURES,
} from "@/features/billing";

import { SectionHeading } from "./SectionHeading";

export function PricingTeaser() {
  const offers = useQuery(offersQuery);
  const monthly = offers.data?.find((offer) => offer.type === "recurring");
  const lifetime = offers.data?.find((offer) => offer.type === "one_time");
  const plans = [
    {
      name: "Free",
      price: "$0",
      cadence: "for ever",
      features: FREE_FEATURES,
      highlighted: false,
    },
    {
      name: "Pro",
      price: monthly ? describeOffer(monthly).price : "Pro",
      cadence: monthly ? describeOffer(monthly).cadence : "",
      note: lifetime
        ? `or ${describeOffer(lifetime).price} once, for life`
        : undefined,
      features: PRO_FEATURES,
      highlighted: true,
    },
  ];

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Pricing"
        title="Free to start. Pro when you want more."
        centered
      />
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            data-reveal
            className={cn(
              "flex flex-col gap-5 rounded-3xl border p-6",
              plan.highlighted
                ? "border-primary/40 bg-primary/[0.05]"
                : "border-border/80 bg-card/60",
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-lg font-semibold">{plan.name}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-[-0.03em]">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.cadence}
                </span>
              </span>
            </div>
            {plan.note ? (
              <p className="-mt-3 text-right text-xs text-muted-foreground">
                {plan.note}
              </p>
            ) : null}
            <ul className="flex flex-col gap-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success-foreground"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Link
        to="/pricing"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "h-11 self-center px-5",
        )}
      >
        Compare plans
        <ArrowRight aria-hidden="true" data-icon="inline-end" />
      </Link>
    </section>
  );
}
