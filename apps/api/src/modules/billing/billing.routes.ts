import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { listPricesRoute } from "./routes";
import type { ListPricesUseCase } from "./use-cases";

export interface BillingActions {
  listPrices: Executable<ListPricesUseCase>;
}

export const billingRoutes = (actions: BillingActions) =>
  new Elysia({ name: "billing", prefix: "/billing" }).get(
    "/prices",
    ...listPricesRoute(actions),
  );
