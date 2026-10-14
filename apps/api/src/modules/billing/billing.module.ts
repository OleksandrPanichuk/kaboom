import { MemoryBillingProvider } from "@/adapters/billing/memory.billing-provider";
import { StripeBillingProvider } from "@/adapters/billing/stripe";
import { UnavailableBillingProvider } from "@/adapters/billing/unavailable.billing-provider";
import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind, makeService, makeUseCase } from "@/core/registry";

import type { PriceOffer } from "./billing.constants";
import { billingRoutes } from "./billing.routes";
import { BillingCatalogService } from "./billing-catalog.service";
import { BillingPricesRepository, BillingProvider } from "./ports";
import { PostgresBillingPricesRepository } from "./repositories";
import { ListPricesUseCase } from "./use-cases";

export const billingModule = defineModule({
  name: "billing",

  register: ({ env }) => {
    const offers: PriceOffer[] = [
      {
        lookupKey: env.BILLING_PRICE_PRO_MONTHLY,
        planKey: "pro",
        type: "recurring",
      },
      {
        lookupKey: env.BILLING_PRICE_PRO_LIFETIME,
        planKey: "pro",
        type: "one_time",
      },
    ];

    bind(BillingPricesRepository, () => new PostgresBillingPricesRepository());

    if (env.NODE_ENV === NodeEnv.Test) {
      const provider = new MemoryBillingProvider();

      bind(BillingProvider, () => provider);

      return { offers, configured: true };
    }

    const provider = env.STRIPE_SECRET_KEY
      ? new StripeBillingProvider({
          secretKey: env.STRIPE_SECRET_KEY,
          appName: env.APP_NAME,
        })
      : new UnavailableBillingProvider();

    bind(BillingProvider, () => provider);

    return { offers, configured: env.STRIPE_SECRET_KEY !== undefined };
  },

  start: async ({ state }) => {
    if (!state.configured) return;

    await makeService(BillingCatalogService).syncPrices(state.offers);
  },

  routes: () =>
    billingRoutes({
      listPrices: makeUseCase(ListPricesUseCase),
    }),
});
