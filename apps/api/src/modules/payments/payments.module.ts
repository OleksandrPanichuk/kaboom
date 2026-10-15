import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { PaymentEventHandler } from "./handlers";
import { paymentsRoutes } from "./payments.routes";
import { PaymentsRepository } from "./ports";
import { PostgresPaymentsRepository } from "./repositories";
import { ListPaymentsUseCase } from "./use-cases";

export const paymentsModule = defineModule({
  name: "payments",

  register: () => {
    bind(PaymentsRepository, () => new PostgresPaymentsRepository());
    registerBillingEventHandler("payment", PaymentEventHandler);
  },

  routes: () =>
    paymentsRoutes({ listPayments: makeUseCase(ListPaymentsUseCase) }),
});
