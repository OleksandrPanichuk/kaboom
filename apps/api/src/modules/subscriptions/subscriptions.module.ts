import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { SubscriptionEventHandler } from "./handlers";
import { SubscriptionsRepository } from "./ports";
import { PostgresSubscriptionsRepository } from "./repositories";

export const subscriptionsModule = defineModule({
  name: "subscriptions",

  register: () => {
    bind(SubscriptionsRepository, () => new PostgresSubscriptionsRepository());
    registerBillingEventHandler("subscription", SubscriptionEventHandler);
  },
});
