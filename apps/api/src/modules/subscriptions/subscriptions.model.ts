import { t } from "elysia";

import {
  SUBSCRIPTION_CHANGE_ACTORS,
  SUBSCRIPTION_CHANGE_KINDS,
  SUBSCRIPTION_STATUSES,
} from "@/db";

export const SubscriptionChangeModel = t.Object({
  id: t.String({ format: "uuid" }),
  kind: t.UnionEnum(SUBSCRIPTION_CHANGE_KINDS),
  fromStatus: t.Nullable(t.UnionEnum(SUBSCRIPTION_STATUSES)),
  toStatus: t.Nullable(t.UnionEnum(SUBSCRIPTION_STATUSES)),
  actor: t.UnionEnum(SUBSCRIPTION_CHANGE_ACTORS, {
    description: "Who made the change: you, the app, or the billing provider",
  }),
  effectiveAt: t.Date(),
});
export type SubscriptionChangeModel = typeof SubscriptionChangeModel.static;

export const SubscriptionModel = t.Object({
  status: t.UnionEnum(SUBSCRIPTION_STATUSES),
  currentPeriodEnd: t.Nullable(t.Date()),
  cancelAtPeriodEnd: t.Boolean({
    description: "It ends at currentPeriodEnd unless resumed before then",
  }),
  cancelAt: t.Nullable(t.Date()),
  trialEnd: t.Nullable(t.Date()),
});
export type SubscriptionModel = typeof SubscriptionModel.static;
