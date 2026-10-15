import { SubscriptionEntity } from "@/modules/subscriptions";

import type { SubscriptionCheckoutModel } from "./checkout.model";
import type { SubscriptionCheckout } from "./checkout.service";

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
}
