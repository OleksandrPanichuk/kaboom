import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { listPricesRoute, receiveWebhookRoute } from "./routes";
import type { ListPricesUseCase, ReceiveWebhookUseCase } from "./use-cases";

export interface BillingActions {
  listPrices: Executable<ListPricesUseCase>;
  receiveWebhook: Executable<ReceiveWebhookUseCase>;
}

export const billingRoutes = (actions: BillingActions) =>
  new Elysia({ name: "billing", prefix: "/billing" })
    .get("/prices", ...listPricesRoute(actions))
    .post("/webhooks/:provider", ...receiveWebhookRoute(actions));
