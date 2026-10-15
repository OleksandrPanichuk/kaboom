import type { BillingOfferModel } from "@repo/api-client";

import { formatMoney } from "./formatMoney";

export interface OfferDescription {
  price: string;
  cadence: string;
  name: string;
}

export const describeOffer = (offer: BillingOfferModel): OfferDescription => {
  const price = formatMoney(offer.unitAmount, offer.currency);

  if (offer.type === "one_time") {
    return { price, cadence: "once", name: "Pro for life" };
  }

  const every =
    offer.intervalCount && offer.intervalCount > 1
      ? `every ${offer.intervalCount} ${offer.interval}s`
      : `a ${offer.interval ?? "month"}`;

  return { price, cadence: every, name: "Pro" };
};
