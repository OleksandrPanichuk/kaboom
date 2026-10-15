import { make, makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import {
  BillingProvider,
  type ProviderEvent,
} from "@/modules/billing-provider";

import type { BillingEventEntity } from "./billing-event.entity";
import { ProcessBillingEventJob } from "./jobs/process-billing-event.job";
import { BillingEventsRepository } from "./ports";

export interface InboxedBillingEvent {
  event: BillingEventEntity;
  duplicate: boolean;
  queued: boolean;
}

const jobIdOf = (event: BillingEventEntity): string =>
  event.status === "failed" ? `${event.id}-retry-${event.attempts}` : event.id;

export class BillingEventInboxService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly events = makeRepository(BillingEventsRepository);

  private readonly processEvent = make(ProcessBillingEventJob);

  public async receive(parsed: ProviderEvent): Promise<InboxedBillingEvent> {
    const { event, duplicate } = await this.events.receive({
      ...parsed,
      provider: this.provider.name,
    });
    const queued = event.status === "pending" || event.status === "failed";

    if (queued) {
      await this.processEvent.dispatch(
        { eventId: event.id },
        { jobId: jobIdOf(event) },
      );
    }

    return { event, duplicate, queued };
  }
}
