import { Port } from "@/core/port";
import type {
  BillingEventTopic,
  BillingProviderName,
  PriceInterval,
  PriceType,
  TaxBehavior,
} from "@/db";

export interface ProviderPrice {
  id: string;
  lookupKey: string | null;
  type: PriceType;
  interval: PriceInterval | null;
  intervalCount: number | null;
  unitAmount: number;
  currency: string;
  taxBehavior: TaxBehavior;
  active: boolean;
}

export interface ProviderEvent {
  id: string;
  type: string;
  topic: BillingEventTopic | null;
  objectId: string | null;
  live: boolean;
  createdAt: Date;
  payload: unknown;
}

export abstract class BillingProvider extends Port {
  public abstract readonly name: BillingProviderName;

  public abstract readonly available: boolean;

  public abstract readonly signatureHeader: string;

  public abstract parseWebhook(
    payload: string,
    signature: string | null,
  ): Promise<ProviderEvent>;

  public abstract findPrices(
    lookupKeys: readonly string[],
  ): Promise<ProviderPrice[]>;
}
