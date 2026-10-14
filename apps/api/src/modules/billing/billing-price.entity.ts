import type { BillingPriceRow } from "@/db";

import type { BillingPriceModel } from "./billing.model";

export interface BillingPriceEntity extends BillingPriceRow {
  lookupKey: string;
}

export class BillingPriceEntity {
  public static normalize(price: BillingPriceEntity): BillingPriceModel {
    return {
      lookupKey: price.lookupKey,
      planKey: price.planKey,
      type: price.type,
      interval: price.interval,
      intervalCount: price.intervalCount,
      unitAmount: price.unitAmount,
      currency: price.currency,
      taxBehavior: price.taxBehavior,
    };
  }
}
