import type { SubscriptionStatus } from "@/db";

export const ENDED_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "canceled",
  "incomplete_expired",
];
