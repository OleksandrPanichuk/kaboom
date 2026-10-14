import { t } from "elysia";

import { PLAN_KEYS, PRICE_INTERVALS, PRICE_TYPES, TAX_BEHAVIORS } from "@/db";

export const BillingOfferModel = t.Object({
  key: t.String({ description: "The offer, such as pro_monthly" }),
  planKey: t.UnionEnum(PLAN_KEYS),
  type: t.UnionEnum(PRICE_TYPES, {
    description: "recurring for a subscription, one_time for lifetime access",
  }),
  interval: t.Nullable(t.UnionEnum(PRICE_INTERVALS)),
  intervalCount: t.Nullable(t.Integer()),
  unitAmount: t.Integer({
    description: "In the currency's smallest unit, such as cents",
  }),
  currency: t.String({ description: "Lowercase ISO 4217 code" }),
  taxBehavior: t.UnionEnum(TAX_BEHAVIORS),
});
export type BillingOfferModel = typeof BillingOfferModel.static;
