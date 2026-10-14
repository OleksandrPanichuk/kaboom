import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { listOffersRoute, receiveWebhookRoute } from "./routes";
import type { ListOffersUseCase, ReceiveWebhookUseCase } from "./use-cases";

export interface BillingActions {
  listOffers: Executable<ListOffersUseCase>;
  receiveWebhook: Executable<ReceiveWebhookUseCase>;
}

export const billingRoutes = (actions: BillingActions) =>
  new Elysia({ name: "billing", prefix: "/billing" })
    .get("/offers", ...listOffersRoute(actions))
    .post("/webhooks/:provider", ...receiveWebhookRoute(actions));
