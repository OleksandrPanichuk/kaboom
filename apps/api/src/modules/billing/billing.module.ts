import { MemoryBillingProvider } from "@/adapters/billing/memory.billing-provider";
import { StripeBillingProvider } from "@/adapters/billing/stripe";
import { UnavailableBillingProvider } from "@/adapters/billing/unavailable.billing-provider";
import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind, makeService, makeUseCase } from "@/core/registry";
import { registerJob } from "@/platform/jobs";

import { billingRoutes } from "./billing.routes";
import { BillingCatalogService } from "./billing-catalog.service";
import { ProcessBillingEventJob } from "./jobs";
import {
  BillingEventsRepository,
  BillingOffersRepository,
  BillingPricesRepository,
  BillingProvider,
} from "./ports";
import {
  PostgresBillingEventsRepository,
  PostgresBillingOffersRepository,
  PostgresBillingPricesRepository,
} from "./repositories";
import { ListOffersUseCase, ReceiveWebhookUseCase } from "./use-cases";

export const billingModule = defineModule({
  name: "billing",

  register: ({ env }) => {
    bind(BillingOffersRepository, () => new PostgresBillingOffersRepository());
    bind(BillingPricesRepository, () => new PostgresBillingPricesRepository());
    bind(BillingEventsRepository, () => new PostgresBillingEventsRepository());
    registerJob(ProcessBillingEventJob);

    if (env.NODE_ENV === NodeEnv.Test) {
      const provider = new MemoryBillingProvider();

      bind(BillingProvider, () => provider);

      return { configured: true };
    }

    const provider =
      env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
        ? new StripeBillingProvider({
            secretKey: env.STRIPE_SECRET_KEY,
            webhookSecret: env.STRIPE_WEBHOOK_SECRET,
            appName: env.APP_NAME,
          })
        : new UnavailableBillingProvider();

    bind(BillingProvider, () => provider);

    return { configured: provider instanceof StripeBillingProvider };
  },

  start: async ({ state }) => {
    if (!state.configured) return;

    await makeService(BillingCatalogService).syncPrices();
  },

  routes: () =>
    billingRoutes({
      listOffers: makeUseCase(ListOffersUseCase),
      receiveWebhook: makeUseCase(ReceiveWebhookUseCase),
    }),
});
