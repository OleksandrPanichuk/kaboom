import { defineModule } from "@/core/module";
import { bind, make, makeRepository, makeUseCase } from "@/core/registry";
import { registerJob } from "@/platform/jobs";
import { Metrics } from "@/platform/metrics";

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

  start: () => {
    const events = makeRepository(BillingEventsRepository);
    const metrics = make(Metrics);

    metrics.gauge("billingEventsFailed", () => events.countFailed());
    metrics.gauge("billingOldestPending", async () => {
      const since = await events.oldestPendingSince();

      return since ? (Date.now() - since.getTime()) / 1000 : 0;
    });
  },

  routes: () =>
    billingEventsRoutes({ receiveWebhook: makeUseCase(ReceiveWebhookUseCase) }),
});
