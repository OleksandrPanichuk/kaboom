import type Stripe from "stripe";

import { PRICE_INTERVALS, PRICE_TYPES, TAX_BEHAVIORS } from "@/db";
import type { ProviderPrice } from "@/modules/billing/ports/billing-provider";

const known = <T extends string>(
  values: readonly T[],
  value: string,
  what: string,
): T => {
  const match = values.find((candidate) => candidate === value);

  if (match === undefined) {
    throw new Error(`Stripe sent an unknown ${what}: "${value}"`);
  }

  return match;
};

export const toProviderPrice = (price: Stripe.Price): ProviderPrice => {
  if (price.unit_amount === null) {
    throw new Error(
      `The Stripe price ${price.id} has no unit amount; only flat prices are supported`,
    );
  }

  return {
    id: price.id,
    lookupKey: price.lookup_key,
    type: known(PRICE_TYPES, price.type, "price type"),
    interval: price.recurring
      ? known(PRICE_INTERVALS, price.recurring.interval, "price interval")
      : null,
    intervalCount: price.recurring?.interval_count ?? null,
    unitAmount: price.unit_amount,
    currency: price.currency,
    taxBehavior: known(
      TAX_BEHAVIORS,
      price.tax_behavior ?? "unspecified",
      "tax behaviour",
    ),
    active: price.active,
  };
};
