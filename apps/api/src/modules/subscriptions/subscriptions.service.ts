import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import type { SubscriptionChangeActor, SubscriptionStatus } from "@/db";
import { BillingCustomersService } from "@/modules/billing-customers";
import { BillingNotificationsService } from "@/modules/billing-notifications";
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
  SubscriptionNotFoundError,
} from "./subscriptions.errors";

export interface SubscriptionSyncCause {
  billingEventId: string | null;
  at: Date;
  actor?: SubscriptionChangeActor;
  actorUserId?: string | null;
}

const live = (status: SubscriptionStatus) =>
  !ENDED_SUBSCRIPTION_STATUSES.includes(status);

export class SubscriptionsService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly subscriptions = makeRepository(SubscriptionsRepository);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  private readonly billingNotificationsService = makeService(
    BillingNotificationsService,
  );

  public currentFor(userId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptions.findCurrentForUser(this.provider.name, userId);
  }

  public sync(
    providerCustomerId: string,
    providerSubscriptionId: string,
    cause: SubscriptionSyncCause,
  ): Promise<SubscriptionEntity> {
    return this.billingCustomersService.locked(providerCustomerId, async () =>
      this.accept(await this.fetch(providerSubscriptionId), cause),
    );
  }

  public record(
    subscription: ProviderSubscription,
    cause: SubscriptionSyncCause,
  ): Promise<SubscriptionEntity> {
    return this.billingCustomersService.locked(subscription.customerId, () =>
      this.accept(subscription, cause),
    );
  }

  public async scheduleCancellation(
    userId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<SubscriptionEntity> {
    const current = await this.currentFor(userId);

    if (!current) {
      throw new SubscriptionNotFoundError("You have no subscription");
    }

    const cause = {
      billingEventId: null,
      at: new Date(),
      actor: "user" as const,
      actorUserId: userId,
    };

    if (current.status === "incomplete" && cancelAtPeriodEnd) {
      return this.record(
        await this.provider.cancelSubscription(current.providerSubscriptionId),
        cause,
      );
    }

    if (current.cancelAtPeriodEnd === cancelAtPeriodEnd) return current;

    return this.record(
      await this.provider.scheduleCancellation(
        current.providerSubscriptionId,
        cancelAtPeriodEnd,
      ),
      cause,
    );
  }

  public async cancelNow(
    providerCustomerId: string,
    cause: SubscriptionSyncCause,
  ): Promise<void> {
    const running = await this.subscriptions.listLive(
      this.provider.name,
      providerCustomerId,
    );

    for (const subscription of running) {
      await this.accept(
        await this.provider.cancelSubscription(
          subscription.providerSubscriptionId,
        ),
        cause,
      );
    }
  }

  private async accept(
    incoming: ProviderSubscription,
    cause: SubscriptionSyncCause,
  ): Promise<SubscriptionEntity> {
    const customer = await this.billingCustomersService.ensure(
      incoming.customerId,
    );
    const userId = customer?.userId ?? null;

    if (live(incoming.status)) {
      await this.settleOthers(incoming, userId, cause);
    }

    return this.store(incoming, userId, cause);
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
        { ...cause, actor: "provider", actorUserId: null },
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

    const recorded = await this.subscriptions.recordChanges({
      subscriptionId: row.id,
      changes: subscriptionChanges(before, after, cause.at),
      actor: cause.actor ?? "provider",
      actorUserId: cause.actorUserId ?? null,
      billingEventId: cause.billingEventId,
    });

    await this.billingNotificationsService.subscriptionChanged(
      row.userId,
      recorded,
    );

    return row;
  }
}
