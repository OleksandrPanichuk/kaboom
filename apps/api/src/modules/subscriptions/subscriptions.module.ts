import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { SubscriptionEventHandler } from "./handlers";
import { SubscriptionsRepository } from "./ports";
import { PostgresSubscriptionsRepository } from "./repositories";
import { subscriptionsRoutes } from "./subscriptions.routes";
import {
  CancelSubscriptionUseCase,
  ListSubscriptionChangesUseCase,
  ResumeSubscriptionUseCase,
} from "./use-cases";

export const subscriptionsModule = defineModule({
  name: "subscriptions",

  register: () => {
    bind(SubscriptionsRepository, () => new PostgresSubscriptionsRepository());
    registerBillingEventHandler("subscription", SubscriptionEventHandler);
  },

  routes: () =>
    subscriptionsRoutes({
      listSubscriptionChanges: makeUseCase(ListSubscriptionChangesUseCase),
      cancelSubscription: makeUseCase(CancelSubscriptionUseCase),
      resumeSubscription: makeUseCase(ResumeSubscriptionUseCase),
    }),
});
