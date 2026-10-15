import type { BillingOfferRow, BillingPriceRow } from "@/db";

import type { BillingOfferModel } from "./billing.model";

export interface BillingOfferEntity extends BillingOfferRow {}

export interface OfferedPrice {
  offer: BillingOfferEntity;
  price: BillingPriceRow;
}

export class BillingOfferEntity {
  public static normalize({ offer, price }: OfferedPrice): BillingOfferModel {
    return {
      key: offer.key,
      planKey: offer.planKey,
      type: offer.type,
      interval: offer.interval,
      intervalCount: offer.intervalCount,
      unitAmount: price.unitAmount,
      currency: price.currency,
      taxBehavior: price.taxBehavior,
    };
  }
}
