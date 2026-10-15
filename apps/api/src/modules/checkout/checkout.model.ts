import { t } from "elysia";

import { PURCHASE_STATUSES } from "@/db";
import { SubscriptionModel } from "@/modules/subscriptions";

export const SubscriptionCheckoutModel = t.Object({
  subscription: SubscriptionModel,
  clientSecret: t.Nullable(
    t.String({
      description:
        "Confirm the first payment with this in the provider's payment form. Null when nothing is due now.",
    }),
  ),
});
export type SubscriptionCheckoutModel = typeof SubscriptionCheckoutModel.static;

export const LifetimeCheckoutModel = t.Object({
  purchase: t.Object({
    status: t.UnionEnum(PURCHASE_STATUSES),
    amount: t.Integer({ description: "In the currency's smallest unit" }),
    currency: t.String(),
  }),
  clientSecret: t.Nullable(
    t.String({
      description:
        "Confirm the payment with this in the provider's payment form. Null when nothing is due.",
    }),
  ),
});
export type LifetimeCheckoutModel = typeof LifetimeCheckoutModel.static;
