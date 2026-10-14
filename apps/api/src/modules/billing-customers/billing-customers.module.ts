import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { CustomerEventHandler } from "./handlers";
import { BillingCustomersRepository } from "./ports";
import { PostgresBillingCustomersRepository } from "./repositories";

export const billingCustomersModule = defineModule({
  name: "billing-customers",

  register: () => {
    bind(
      BillingCustomersRepository,
      () => new PostgresBillingCustomersRepository(),
    );
    registerBillingEventHandler("customer", CustomerEventHandler);
  },
});
