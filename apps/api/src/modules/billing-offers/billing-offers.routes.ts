import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { listOffersRoute } from "./routes";
import type { ListOffersUseCase } from "./use-cases";

export interface BillingOffersActions {
  listOffers: Executable<ListOffersUseCase>;
}

export const billingOffersRoutes = (actions: BillingOffersActions) =>
  new Elysia({ name: "billing-offers", prefix: "/billing/offers" }).get(
    "/",
    ...listOffersRoute(actions),
  );
