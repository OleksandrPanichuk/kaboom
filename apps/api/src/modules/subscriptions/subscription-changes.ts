import type { SubscriptionChangeKind, SubscriptionStatus } from "@/db";
import type { ProviderSubscription } from "@/modules/billing-provider";

import type { SubscriptionEntity } from "./subscription.entity";

export interface SubscriptionChangeDraft {
  kind: SubscriptionChangeKind;
  fromStatus: SubscriptionStatus | null;
  toStatus: SubscriptionStatus | null;
  fromProviderPriceId: string | null;
  toProviderPriceId: string | null;
  fromQuantity: number | null;
  toQuantity: number | null;
  effectiveAt: Date;
}

const NO_CHANGE = {
  fromStatus: null,
  toStatus: null,
  fromProviderPriceId: null,
  toProviderPriceId: null,
  fromQuantity: null,
  toQuantity: null,
};

const statusKind = (
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): SubscriptionChangeKind => {
  if (to === "canceled") return "canceled";
  if (to === "paused") return "paused";
  if (from === "paused") return "resumed";

  return "status_changed";
};

const endedAt = (after: ProviderSubscription, at: Date): Date =>
  after.endedAt ?? after.canceledAt ?? at;

const scheduled = ({
  cancelAtPeriodEnd,
  cancelAt,
}: {
  cancelAtPeriodEnd: boolean;
  cancelAt: Date | null;
}) => cancelAtPeriodEnd || cancelAt !== null;

export const subscriptionChanges = (
  before: SubscriptionEntity | null,
  after: ProviderSubscription,
  at: Date,
): SubscriptionChangeDraft[] => {
  if (!before) {
    const created: SubscriptionChangeDraft = {
      ...NO_CHANGE,
      kind: "created",
      toStatus: after.status,
      toProviderPriceId: after.priceId,
      toQuantity: after.quantity,
      effectiveAt: after.createdAt,
    };

    return after.status === "canceled"
      ? [
          created,
          {
            ...NO_CHANGE,
            kind: "canceled",
            toStatus: "canceled",
            effectiveAt: endedAt(after, at),
          },
        ]
      : [created];
  }

  const changes: SubscriptionChangeDraft[] = [];

  if (before.providerPriceId !== after.priceId) {
    changes.push({
      ...NO_CHANGE,
      kind: "plan_changed",
      fromProviderPriceId: before.providerPriceId,
      toProviderPriceId: after.priceId,
      effectiveAt: at,
    });
  }

  if (before.quantity !== after.quantity) {
    changes.push({
      ...NO_CHANGE,
      kind: "quantity_changed",
      fromQuantity: before.quantity,
      toQuantity: after.quantity,
      effectiveAt: at,
    });
  }

  if (before.status !== after.status) {
    const kind = statusKind(before.status, after.status);

    changes.push({
      ...NO_CHANGE,
      kind,
      fromStatus: before.status,
      toStatus: after.status,
      effectiveAt: kind === "canceled" ? endedAt(after, at) : at,
    });
  }

  if (after.status !== "canceled" && scheduled(before) !== scheduled(after)) {
    changes.push({
      ...NO_CHANGE,
      kind: scheduled(after) ? "cancel_scheduled" : "cancel_unscheduled",
      effectiveAt: at,
    });
  }

  if (
    after.status !== "canceled" &&
    before.currentPeriodStart !== null &&
    after.currentPeriodStart !== null &&
    after.currentPeriodStart > before.currentPeriodStart
  ) {
    changes.push({
      ...NO_CHANGE,
      kind: "renewed",
      effectiveAt: after.currentPeriodStart,
    });
  }

  return changes;
};
