import type { Token } from "@/core/registry";
import type { BillingEventTopic } from "@/db";

import type { BillingEventEntity } from "./billing-event.entity";

export interface BillingEventHandler {
  handle(event: BillingEventEntity): Promise<void>;
}

const handlers = new Map<
  BillingEventTopic,
  Array<Token<BillingEventHandler>>
>();

export const registerBillingEventHandler = (
  topic: BillingEventTopic,
  handler: Token<BillingEventHandler>,
): (() => void) => {
  handlers.set(topic, [...(handlers.get(topic) ?? []), handler]);

  return () => {
    handlers.set(
      topic,
      (handlers.get(topic) ?? []).filter((candidate) => candidate !== handler),
    );
  };
};

export const billingEventHandlersFor = (
  topic: BillingEventTopic | null,
): ReadonlyArray<Token<BillingEventHandler>> =>
  topic === null ? [] : (handlers.get(topic) ?? []);
