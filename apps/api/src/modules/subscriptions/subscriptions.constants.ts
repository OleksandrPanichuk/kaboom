import { MINUTE } from "@/constants";
import type { SubscriptionStatus } from "@/db";

export const ENDED_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "canceled",
  "incomplete_expired",
];

export const CHANGE_SUBSCRIPTION_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * MINUTE,
} as const;
