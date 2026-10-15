import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { receiveWebhookRoute } from "./routes";
import type { ReceiveWebhookUseCase } from "./use-cases";

export interface BillingEventsActions {
  receiveWebhook: Executable<ReceiveWebhookUseCase>;
}

export const billingEventsRoutes = (actions: BillingEventsActions) =>
  new Elysia({ name: "billing-events", prefix: "/billing/webhooks" }).post(
    "/:provider",
    ...receiveWebhookRoute(actions),
  );
