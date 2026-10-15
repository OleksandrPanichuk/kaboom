import { and, eq, notInArray, sql } from "drizzle-orm";

import {
  type BillingProviderName,
  subscriptionChangesSchema,
  subscriptionsSchema,
} from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type RecordSubscriptionChangesData,
  SubscriptionsRepository,
  type SyncSubscriptionData,
} from "../ports";
import type { SubscriptionEntity } from "../subscription.entity";
import { ENDED_SUBSCRIPTION_STATUSES } from "../subscriptions.constants";

export class PostgresSubscriptionsRepository extends SubscriptionsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async findByProviderId(
    provider: BillingProviderName,
    providerSubscriptionId: string,
  ): Promise<SubscriptionEntity | null> {
    const [row] = await this.db
      .select()
      .from(subscriptionsSchema)
      .where(
        and(
          eq(subscriptionsSchema.provider, provider),
          eq(
            subscriptionsSchema.providerSubscriptionId,
            providerSubscriptionId,
          ),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  public listLive(
    provider: BillingProviderName,
    providerCustomerId: string,
  ): Promise<SubscriptionEntity[]> {
    return this.db
      .select()
      .from(subscriptionsSchema)
      .where(
        and(
          eq(subscriptionsSchema.provider, provider),
          eq(subscriptionsSchema.providerCustomerId, providerCustomerId),
          notInArray(subscriptionsSchema.status, [
            ...ENDED_SUBSCRIPTION_STATUSES,
          ]),
        ),
      );
  }

  public async sync(
    data: SyncSubscriptionData,
    at: Date,
  ): Promise<SubscriptionEntity> {
    const values = {
      providerCustomerId: data.customerId,
      providerPriceId: data.priceId,
      status: data.status,
      quantity: data.quantity,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      cancelAt: data.cancelAt,
      canceledAt: data.canceledAt,
      cancellationReason: data.cancellationReason,
      endedAt: data.endedAt,
      trialStart: data.trialStart,
      trialEnd: data.trialEnd,
      latestProviderInvoiceId: data.latestInvoiceId,
      providerCreatedAt: data.createdAt,
      syncedAt: at,
      updatedAt: at,
    };

    const [row] = await this.db
      .insert(subscriptionsSchema)
      .values({
        provider: data.provider,
        providerSubscriptionId: data.id,
        userId: data.userId,
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          subscriptionsSchema.provider,
          subscriptionsSchema.providerSubscriptionId,
        ],
        set: {
          ...values,
          userId: sql`coalesce(excluded.user_id, ${subscriptionsSchema.userId})`,
        },
      })
      .returning();

    return row!;
  }

  public async recordChanges({
    subscriptionId,
    changes,
    actor,
    billingEventId,
  }: RecordSubscriptionChangesData): Promise<void> {
    if (changes.length === 0) return;

    await this.db
      .insert(subscriptionChangesSchema)
      .values(
        changes.map((change) => ({
          ...change,
          subscriptionId,
          actor,
          billingEventId,
        })),
      )
      .onConflictDoNothing();
  }
}
