import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";
import { registerUserLifecycleListener } from "@/modules/users";

import { billingCustomersRoutes } from "./billing-customers.routes";
import { BillingUserLifecycle } from "./billing-user-lifecycle";
import { CustomerEventHandler } from "./handlers";
import { BillingCustomersRepository } from "./ports";
import { PostgresBillingCustomersRepository } from "./repositories";
import { UpdateBillingDetailsUseCase } from "./use-cases";

export const billingCustomersModule = defineModule({
  name: "billing-customers",

  register: () => {
    bind(
      BillingCustomersRepository,
      () => new PostgresBillingCustomersRepository(),
    );
    registerBillingEventHandler("customer", CustomerEventHandler);
    registerUserLifecycleListener(BillingUserLifecycle);
  },

  routes: () =>
    billingCustomersRoutes({
      updateBillingDetails: makeUseCase(UpdateBillingDetailsUseCase),
    }),
});
