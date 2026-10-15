import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getBillingAccountRoute } from "./routes";
import type { GetBillingAccountUseCase } from "./use-cases";

export interface BillingAccountActions {
  getBillingAccount: Executable<GetBillingAccountUseCase>;
}

export const billingAccountRoutes = (actions: BillingAccountActions) =>
  new Elysia({ name: "billing-account", prefix: "/billing/me" }).get(
    "/",
    ...getBillingAccountRoute(actions),
  );
