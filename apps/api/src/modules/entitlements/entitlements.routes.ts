import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getMyEntitlementsRoute } from "./routes";
import type { GetMyEntitlementsUseCase } from "./use-cases";

export interface EntitlementsActions {
  getMyEntitlements: Executable<GetMyEntitlementsUseCase>;
}

export const entitlementsRoutes = (actions: EntitlementsActions) =>
  new Elysia({ name: "entitlements", prefix: "/entitlements" }).get(
    "/me",
    ...getMyEntitlementsRoute(actions),
  );
