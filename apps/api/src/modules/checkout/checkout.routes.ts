import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { subscribeRoute } from "./routes";
import type { SubscribeUseCase } from "./use-cases";

export interface CheckoutActions {
  subscribe: Executable<SubscribeUseCase>;
}

export const checkoutRoutes = (actions: CheckoutActions) =>
  new Elysia({ name: "checkout", prefix: "/billing/checkout" }).post(
    "/subscription",
    ...subscribeRoute(actions),
  );
