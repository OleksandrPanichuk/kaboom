import { make, makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import { billingEventHandlerFor } from "./billing-event.handlers";
import { BillingEventsRepository } from "./ports";

export type ProcessedBillingEvent = "processed" | "ignored" | "skipped";

export class BillingEventsService extends Service {
  private readonly events = makeRepository(BillingEventsRepository);

  public async process(eventId: string): Promise<ProcessedBillingEvent> {
    const event = await this.events.claim(eventId);

    if (!event) return "skipped";

    const handler = billingEventHandlerFor(event.topic);
    const status = handler ? "processed" : "ignored";

    if (handler) await make(handler).handle(event);

    await this.events.settle(event.id, status, new Date());

    return status;
  }
}
