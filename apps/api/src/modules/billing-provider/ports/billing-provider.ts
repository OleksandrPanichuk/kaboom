import { Port } from "@/core/port";
import type {
  BillingEventTopic,
  BillingProviderName,
  PriceInterval,
  PriceType,
  SubscriptionStatus,
  TaxBehavior,
  TaxExemptStatus,
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
  customerId: string | null;
  live: boolean;
  createdAt: Date;
  payload: unknown;
}

export interface ProviderAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface ProviderCard {
  paymentMethodId: string;
  brand: string | null;
  last4: string | null;
}

export interface ProviderCustomer {
  id: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  address: ProviderAddress | null;
  card: ProviderCard | null;
  taxExempt: TaxExemptStatus;
  balance: number;
}

export interface ProviderSubscription {
  id: string;
  customerId: string;
  priceId: string;
  status: SubscriptionStatus;
  quantity: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: Date | null;
  canceledAt: Date | null;
  cancellationReason: string | null;
  endedAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  latestInvoiceId: string | null;
  createdAt: Date;
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

  public abstract findCustomer(id: string): Promise<ProviderCustomer | null>;

  public abstract findSubscription(
    id: string,
  ): Promise<ProviderSubscription | null>;
}
