import { defineModule } from "@/core/module";
import { makeUseCase } from "@/core/registry";

import { checkoutRoutes } from "./checkout.routes";
import { SubscribeUseCase } from "./use-cases";

export const checkoutModule = defineModule({
  name: "checkout",

  routes: () => checkoutRoutes({ subscribe: makeUseCase(SubscribeUseCase) }),
});
