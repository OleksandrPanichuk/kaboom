import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";

import type { BillingEventEntity } from "../billing-event.entity";
import type { ProviderEvent } from "./billing-provider";

export interface ReceiveBillingEventData extends ProviderEvent {
  provider: BillingProviderName;
}

export interface ReceivedBillingEvent {
  event: BillingEventEntity;
  duplicate: boolean;
}

export abstract class BillingEventsRepository extends Repository {
  public abstract receive(
    data: ReceiveBillingEventData,
  ): Promise<ReceivedBillingEvent>;

  public abstract claim(id: string): Promise<BillingEventEntity | null>;

  public abstract settle(
    id: string,
    status: "processed" | "ignored",
    at: Date,
  ): Promise<void>;

  public abstract recordError(
    id: string,
    message: string,
    final: boolean,
  ): Promise<void>;
}
