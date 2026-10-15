import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { billingTaxIdsRoutes } from "./billing-tax-ids.routes";
import { TaxIdEventHandler } from "./handlers";
import { BillingTaxIdsRepository } from "./ports";
import { PostgresBillingTaxIdsRepository } from "./repositories";
import {
  AddTaxIdUseCase,
  ListTaxIdsUseCase,
  RemoveTaxIdUseCase,
} from "./use-cases";

export const billingTaxIdsModule = defineModule({
  name: "billing-tax-ids",

  register: () => {
    bind(BillingTaxIdsRepository, () => new PostgresBillingTaxIdsRepository());
    registerBillingEventHandler("tax_id", TaxIdEventHandler);
  },

  routes: () =>
    billingTaxIdsRoutes({
      listTaxIds: makeUseCase(ListTaxIdsUseCase),
      addTaxId: makeUseCase(AddTaxIdUseCase),
      removeTaxId: makeUseCase(RemoveTaxIdUseCase),
    }),
});
