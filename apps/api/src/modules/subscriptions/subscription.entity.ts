import type { SubscriptionChangeRow, SubscriptionRow } from "@/db";

import type {
  SubscriptionChangeModel,
  SubscriptionModel,
} from "./subscriptions.model";

export interface SubscriptionEntity extends SubscriptionRow {}

export class SubscriptionEntity {
  public static normalize(subscription: SubscriptionEntity): SubscriptionModel {
    return {
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelAt: subscription.cancelAt,
      trialEnd: subscription.trialEnd,
    };
  }
}

export interface SubscriptionChangeEntity extends SubscriptionChangeRow {}

export class SubscriptionChangeEntity {
  public static normalize(
    change: SubscriptionChangeEntity,
  ): SubscriptionChangeModel {
    return {
      id: change.id,
      kind: change.kind,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      actor: change.actor,
      effectiveAt: change.effectiveAt,
    };
  }
}
