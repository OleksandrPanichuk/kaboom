import { defineModule } from "@/core/module";
import { makeUseCase } from "@/core/registry";

import { entitlementsRoutes } from "./entitlements.routes";
import { GetMyEntitlementsUseCase } from "./use-cases";

export const entitlementsModule = defineModule({
  name: "entitlements",

  routes: () =>
    entitlementsRoutes({
      getMyEntitlements: makeUseCase(GetMyEntitlementsUseCase),
    }),
});
