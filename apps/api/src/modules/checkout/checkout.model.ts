import { t } from "elysia";

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
