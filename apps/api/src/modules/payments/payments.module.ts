import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { PaymentEventHandler } from "./handlers";
import { PaymentsRepository } from "./ports";
import { PostgresPaymentsRepository } from "./repositories";

export const paymentsModule = defineModule({
  name: "payments",

  register: () => {
    bind(PaymentsRepository, () => new PostgresPaymentsRepository());
    registerBillingEventHandler("payment", PaymentEventHandler);
  },
});
