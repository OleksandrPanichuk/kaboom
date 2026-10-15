import { make, makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import { billingEventHandlersFor } from "./billing-event.handlers";
import { BillingEventsRepository } from "./ports";

export type ProcessedBillingEvent = "processed" | "ignored" | "skipped";

export class BillingEventsService extends Service {
  private readonly events = makeRepository(BillingEventsRepository);

  public async process(eventId: string): Promise<ProcessedBillingEvent> {
    const event = await this.events.claim(eventId);

    if (!event) return "skipped";

    const handlers = billingEventHandlersFor(event.topic);
    const status = handlers.length > 0 ? "processed" : "ignored";

    for (const handler of handlers) await make(handler).handle(event);

    await this.events.settle(event.id, status, new Date());

    return status;
  }
}
