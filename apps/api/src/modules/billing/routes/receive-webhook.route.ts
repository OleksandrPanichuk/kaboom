import { t } from "elysia";

import { defineRoute } from "@/core/route";

import type { BillingActions } from "../billing.routes";
import { WebhookParams } from "./webhook-params";

export const receiveWebhookRoute = ({ receiveWebhook }: BillingActions) =>
  defineRoute({
    params: WebhookParams,
    body: t.String(),
    parse: "text",
    response: t.Object({ received: t.Literal(true), duplicate: t.Boolean() }),
    summary: "Receive a webhook from the billing provider",
    description:
      "Checks the provider's signature over the raw body, stores the event once and queues it for processing. A redelivered event is acknowledged again and changes nothing.",

    action: ({ params, body, headers }) =>
      receiveWebhook.execute({
        provider: params.provider,
        payload: body,
        headers,
      }),
    postAction: ({ output }) => ({
      received: true as const,
      duplicate: output.duplicate,
    }),
  });
