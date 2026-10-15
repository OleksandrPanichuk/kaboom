import { t } from "elysia";

import { PURCHASE_STATUSES } from "@/db";
import { BillingCustomerModel } from "@/modules/billing-customers";
import { SubscriptionModel } from "@/modules/subscriptions";

export const BillingAccountModel = t.Object({
  plan: t.Union([t.Literal("free"), t.Literal("pro")]),
  source: t.Nullable(
    t.Union([t.Literal("subscription"), t.Literal("lifetime")], {
      description: "What gives Pro: lifetime wins when you have both",
    }),
  ),
  subscription: t.Nullable(SubscriptionModel),
  lifetime: t.Nullable(
    t.Object({
      status: t.UnionEnum(PURCHASE_STATUSES),
      amount: t.Integer({ description: "In the currency's smallest unit" }),
      amountRefunded: t.Integer(),
      currency: t.String(),
      paidAt: t.Nullable(t.Date()),
    }),
  ),
  customer: t.Nullable(BillingCustomerModel),
});
export type BillingAccountModel = typeof BillingAccountModel.static;
