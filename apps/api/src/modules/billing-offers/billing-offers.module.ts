import { defineModule } from "@/core/module";
import { bind, make, makeService, makeUseCase } from "@/core/registry";
import { BillingProvider } from "@/modules/billing-provider";

import { billingOffersRoutes } from "./billing-offers.routes";
import { BillingOffersService } from "./billing-offers.service";
import { BillingOffersRepository, BillingPricesRepository } from "./ports";
import {
  PostgresBillingOffersRepository,
  PostgresBillingPricesRepository,
} from "./repositories";
import { ListOffersUseCase } from "./use-cases";

export const billingOffersModule = defineModule({
  name: "billing-offers",

  register: () => {
    bind(BillingOffersRepository, () => new PostgresBillingOffersRepository());
    bind(BillingPricesRepository, () => new PostgresBillingPricesRepository());
  },

  start: async () => {
    if (!make(BillingProvider).available) return;

    await makeService(BillingOffersService).syncPrices();
  },

  routes: () =>
    billingOffersRoutes({ listOffers: makeUseCase(ListOffersUseCase) }),
});
