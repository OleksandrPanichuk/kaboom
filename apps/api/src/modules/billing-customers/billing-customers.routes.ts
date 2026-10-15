import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { updateBillingDetailsRoute } from "./routes";
import type { UpdateBillingDetailsUseCase } from "./use-cases";

export interface BillingCustomersActions {
  updateBillingDetails: Executable<UpdateBillingDetailsUseCase>;
}

export const billingCustomersRoutes = (actions: BillingCustomersActions) =>
  new Elysia({ name: "billing-customers", prefix: "/billing/details" }).put(
    "/",
    ...updateBillingDetailsRoute(actions),
  );
