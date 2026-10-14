import type { Token } from "@/core/registry";
import type { BillingEventTopic } from "@/db";

import type { BillingEventEntity } from "./billing-event.entity";

export interface BillingEventHandler {
  handle(event: BillingEventEntity): Promise<void>;
}

const handlers = new Map<BillingEventTopic, Token<BillingEventHandler>>();

export const registerBillingEventHandler = (
  topic: BillingEventTopic,
  handler: Token<BillingEventHandler>,
): (() => void) => {
  handlers.set(topic, handler);

  return () => {
    if (handlers.get(topic) === handler) handlers.delete(topic);
  };
};

export const billingEventHandlerFor = (
  topic: BillingEventTopic | null,
): Token<BillingEventHandler> | undefined =>
  topic === null ? undefined : handlers.get(topic);
