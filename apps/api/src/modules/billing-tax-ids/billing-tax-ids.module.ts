import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { TaxIdEventHandler } from "./handlers";
import { BillingTaxIdsRepository } from "./ports";
import { PostgresBillingTaxIdsRepository } from "./repositories";

export const billingTaxIdsModule = defineModule({
  name: "billing-tax-ids",

  register: () => {
    bind(BillingTaxIdsRepository, () => new PostgresBillingTaxIdsRepository());
    registerBillingEventHandler("tax_id", TaxIdEventHandler);
  },
});
