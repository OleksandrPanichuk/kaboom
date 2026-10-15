import { defineRoute } from "@/core/route";

import { CHECKOUT_RATE_LIMIT } from "../checkout.constants";
import { CheckoutEntity } from "../checkout.entity";
import { SubscriptionCheckoutModel } from "../checkout.model";
import type { CheckoutActions } from "../checkout.routes";
import { SubscribeInput } from "../dto";

export const subscribeRoute = ({ subscribe }: CheckoutActions) =>
  defineRoute({
    body: SubscribeInput,
    response: SubscriptionCheckoutModel,
    summary: "Start a subscription",
    description:
      "Creates the subscription with its first payment pending and answers the secret the provider's payment form confirms it with. It becomes active once that payment succeeds. Asking again while it waits answers the same payment. Refused when you already have Pro, and, when tax is collected, until you have a billing address.",
    auth: true,
    rateLimit: {
      ...CHECKOUT_RATE_LIMIT,
      scope: "checkout:start",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user, body }) =>
      subscribe.execute({ userId: user.id, offer: body.offer }),
    postAction: ({ output }) => CheckoutEntity.normalizeSubscription(output),
  });
