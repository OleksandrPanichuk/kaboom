import type { PlanKey, PurchaseStatus, SubscriptionStatus } from "@/db";

export type AccountPlan = "free" | PlanKey;

export type PlanSource = "subscription" | "lifetime";

export const PRO_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];

export const PRO_PURCHASE_STATUSES: readonly PurchaseStatus[] = [
  "paid",
  "partially_refunded",
];

export interface PlanInputs {
  subscription: { status: SubscriptionStatus } | null;
  purchase: { status: PurchaseStatus } | null;
}

export interface PlanOutcome {
  plan: AccountPlan;
  source: PlanSource | null;
}

export const planOf = ({ subscription, purchase }: PlanInputs): PlanOutcome => {
  if (purchase && PRO_PURCHASE_STATUSES.includes(purchase.status)) {
    return { plan: "pro", source: "lifetime" };
  }

  if (subscription && PRO_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    return { plan: "pro", source: "subscription" };
  }

  return { plan: "free", source: null };
};
