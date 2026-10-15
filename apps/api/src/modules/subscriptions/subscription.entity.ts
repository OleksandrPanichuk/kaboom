import type { SubscriptionChangeRow, SubscriptionRow } from "@/db";

import type { SubscriptionChangeModel } from "./subscriptions.model";

export interface SubscriptionEntity extends SubscriptionRow {}

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
