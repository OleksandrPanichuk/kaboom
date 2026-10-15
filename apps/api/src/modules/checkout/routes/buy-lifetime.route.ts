import { defineRoute } from "@/core/route";

import { CHECKOUT_RATE_LIMIT } from "../checkout.constants";
import { CheckoutEntity } from "../checkout.entity";
import { LifetimeCheckoutModel } from "../checkout.model";
import type { CheckoutActions } from "../checkout.routes";
import { BuyLifetimeInput } from "../dto";

export const buyLifetimeRoute = ({ buyLifetime }: CheckoutActions) =>
  defineRoute({
    body: BuyLifetimeInput,
    response: LifetimeCheckoutModel,
    summary: "Buy Pro for life",
    description:
      "Issues a one-off invoice and answers the secret the provider's payment form pays it with. Asking again while it waits answers the same invoice. Once it is paid, a monthly subscription you have ends at once, without a refund for the current month. Refused when you already have Pro for life, and, when tax is collected, until you have a billing address.",
    auth: true,
    rateLimit: {
      ...CHECKOUT_RATE_LIMIT,
      scope: "checkout:start",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user, body }) =>
      buyLifetime.execute({ userId: user.id, offer: body.offer }),
    postAction: ({ output }) => CheckoutEntity.normalizeLifetime(output),
  });
