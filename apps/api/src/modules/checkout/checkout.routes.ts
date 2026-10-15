import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { buyLifetimeRoute, subscribeRoute } from "./routes";
import type { BuyLifetimeUseCase, SubscribeUseCase } from "./use-cases";

export interface CheckoutActions {
  subscribe: Executable<SubscribeUseCase>;
  buyLifetime: Executable<BuyLifetimeUseCase>;
}

export const checkoutRoutes = (actions: CheckoutActions) =>
  new Elysia({ name: "checkout", prefix: "/billing/checkout" })
    .post("/subscription", ...subscribeRoute(actions))
    .post("/lifetime", ...buyLifetimeRoute(actions));
