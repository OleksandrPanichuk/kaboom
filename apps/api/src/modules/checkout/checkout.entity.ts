import { SubscriptionEntity } from "@/modules/subscriptions";

import type {
  LifetimeCheckoutModel,
  SubscriptionCheckoutModel,
} from "./checkout.model";
import type {
  LifetimeCheckout,
  SubscriptionCheckout,
} from "./checkout.service";

export class CheckoutEntity {
  public static normalizeSubscription({
    subscription,
    clientSecret,
  }: SubscriptionCheckout): SubscriptionCheckoutModel {
    return {
      subscription: SubscriptionEntity.normalize(subscription),
      clientSecret,
    };
  }

  public static normalizeLifetime({
    purchase,
    clientSecret,
  }: LifetimeCheckout): LifetimeCheckoutModel {
    return {
      purchase: {
        status: purchase.status,
        amount: purchase.amount,
        currency: purchase.currency,
      },
      clientSecret,
    };
  }
}
