import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import type { SubscriptionStatus } from "@/db";
import { BillingCustomersService } from "@/modules/billing-customers";
import {
  BillingProvider,
  type ProviderSubscription,
} from "@/modules/billing-provider";

import { SubscriptionsRepository } from "./ports";
import type { SubscriptionEntity } from "./subscription.entity";
import { subscriptionChanges } from "./subscription-changes";
import { ENDED_SUBSCRIPTION_STATUSES } from "./subscriptions.constants";
import {
  SubscriptionConflictError,
  SubscriptionNotFoundAtProviderError,
} from "./subscriptions.errors";

export interface SubscriptionSyncCause {
  billingEventId: string | null;
  at: Date;
}

const live = (status: SubscriptionStatus) =>
  !ENDED_SUBSCRIPTION_STATUSES.includes(status);

export class SubscriptionsService extends Service {
  private get provider() {
    return make(BillingProvider);
  }

  private readonly subscriptions = makeRepository(SubscriptionsRepository);

  private readonly customers = makeService(BillingCustomersService);

  public sync(
    providerCustomerId: string,
    providerSubscriptionId: string,
    cause: SubscriptionSyncCause,
  ): Promise<SubscriptionEntity> {
    return this.customers.locked(providerCustomerId, async () => {
      const customer = await this.customers.ensure(providerCustomerId);
      const userId = customer?.userId ?? null;
      const incoming = await this.fetch(providerSubscriptionId);

      if (live(incoming.status)) {
        await this.settleOthers(incoming, userId, cause);
      }

      return this.store(incoming, userId, cause);
    });
  }

  private async settleOthers(
    incoming: ProviderSubscription,
    userId: string | null,
    cause: SubscriptionSyncCause,
  ): Promise<void> {
    const others = await this.subscriptions.listLive(
      this.provider.name,
      incoming.customerId,
    );

    for (const other of others) {
      if (other.providerSubscriptionId === incoming.id) continue;

      const settled = await this.store(
        await this.fetch(other.providerSubscriptionId),
        userId,
        cause,
      );

      if (live(settled.status)) {
        throw new SubscriptionConflictError(
          `The ${this.provider.name} customer ${incoming.customerId} has two live subscriptions, ${settled.providerSubscriptionId} and ${incoming.id}`,
        );
      }
    }
  }

  private async fetch(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscription> {
    const subscription = await this.provider.findSubscription(
      providerSubscriptionId,
    );

    if (!subscription) {
      throw new SubscriptionNotFoundAtProviderError(
        `The ${this.provider.name} subscription ${providerSubscriptionId} does not exist`,
      );
    }

    return subscription;
  }

  private async store(
    after: ProviderSubscription,
    userId: string | null,
    cause: SubscriptionSyncCause,
  ): Promise<SubscriptionEntity> {
    const before = await this.subscriptions.findByProviderId(
      this.provider.name,
      after.id,
    );
    const row = await this.subscriptions.sync(
      { ...after, provider: this.provider.name, userId },
      new Date(),
    );

    await this.subscriptions.recordChanges({
      subscriptionId: row.id,
      changes: subscriptionChanges(before, after, cause.at),
      actor: "provider",
      billingEventId: cause.billingEventId,
    });

    return row;
  }
}
