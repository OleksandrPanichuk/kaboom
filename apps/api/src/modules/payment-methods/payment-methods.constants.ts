import { MINUTE } from "@/constants";
import type { SubscriptionStatus } from "@/db";

export const CARDS_RATE_LIMIT = {
  limit: 20,
  windowMs: 15 * MINUTE,
} as const;

export const CHARGING_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];
