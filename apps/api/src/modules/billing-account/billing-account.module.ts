import { defineModule } from "@/core/module";
import { makeUseCase } from "@/core/registry";

import { billingAccountRoutes } from "./billing-account.routes";
import { GetBillingAccountUseCase } from "./use-cases";

export const billingAccountModule = defineModule({
  name: "billing-account",

  routes: () =>
    billingAccountRoutes({
      getBillingAccount: makeUseCase(GetBillingAccountUseCase),
    }),
});
