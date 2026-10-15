import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerJob } from "@/platform/jobs";

import { billingEventsRoutes } from "./billing-events.routes";
import { ProcessBillingEventJob } from "./jobs";
import { BillingEventsRepository } from "./ports";
import { PostgresBillingEventsRepository } from "./repositories";
import { ReceiveWebhookUseCase } from "./use-cases";

export const billingEventsModule = defineModule({
  name: "billing-events",

  register: () => {
    bind(BillingEventsRepository, () => new PostgresBillingEventsRepository());
    registerJob(ProcessBillingEventJob);
  },

  routes: () =>
    billingEventsRoutes({ receiveWebhook: makeUseCase(ReceiveWebhookUseCase) }),
});
