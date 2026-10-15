import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { PurchaseEventHandler } from "./handlers";
import { PurchasesRepository } from "./ports";
import { PostgresPurchasesRepository } from "./repositories";

export const purchasesModule = defineModule({
  name: "purchases",

  register: () => {
    bind(PurchasesRepository, () => new PostgresPurchasesRepository());
    registerBillingEventHandler("invoice", PurchaseEventHandler);
  },
});
