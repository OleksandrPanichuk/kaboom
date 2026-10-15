import { Repository } from "@/core/repository";
import type { BillingProviderName, SubscriptionChangeActor } from "@/db";
import type { ProviderSubscription } from "@/modules/billing-provider";

import type { SubscriptionEntity } from "../subscription.entity";
import type { SubscriptionChangeDraft } from "../subscription-changes";

export interface SyncSubscriptionData extends ProviderSubscription {
  provider: BillingProviderName;
  userId: string | null;
}

export interface RecordSubscriptionChangesData {
  subscriptionId: string;
  changes: readonly SubscriptionChangeDraft[];
  actor: SubscriptionChangeActor;
  billingEventId: string | null;
}

export abstract class SubscriptionsRepository extends Repository {
  public abstract findByProviderId(
    provider: BillingProviderName,
    providerSubscriptionId: string,
  ): Promise<SubscriptionEntity | null>;

  public abstract listLive(
    provider: BillingProviderName,
    providerCustomerId: string,
  ): Promise<SubscriptionEntity[]>;

  public abstract sync(
    data: SyncSubscriptionData,
    at: Date,
  ): Promise<SubscriptionEntity>;

  public abstract recordChanges(
    data: RecordSubscriptionChangesData,
  ): Promise<void>;
}
