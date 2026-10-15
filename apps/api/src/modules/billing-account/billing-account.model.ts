import { t } from "elysia";

import { PURCHASE_STATUSES } from "@/db";
import { SubscriptionModel } from "@/modules/subscriptions";

export const BillingAddressModel = t.Object({
  line1: t.Nullable(t.String()),
  line2: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  state: t.Nullable(t.String()),
  postalCode: t.Nullable(t.String()),
  country: t.Nullable(t.String({ description: "ISO 3166-1 alpha-2" })),
});
export type BillingAddressModel = typeof BillingAddressModel.static;

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
  customer: t.Nullable(
    t.Object({
      name: t.Nullable(t.String()),
      email: t.Nullable(t.String()),
      address: t.Nullable(BillingAddressModel),
      card: t.Nullable(
        t.Object({
          brand: t.Nullable(t.String()),
          last4: t.Nullable(t.String()),
        }),
      ),
    }),
  ),
});
export type BillingAccountModel = typeof BillingAccountModel.static;
