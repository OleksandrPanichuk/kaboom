import type { BillingAccount } from "@/features/billing/api";

import { formatBillingDate } from "./formatBillingDate";

export type BillingNotice =
  | { kind: "payment-failed" }
  | { kind: "payment-unfinished" }
  | { kind: "ending"; endsOn: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export const ENDING_NOTICE_DAYS = 7;

export const billingNotice = (
  account: BillingAccount,
  now: Date,
): BillingNotice | null => {
  const { subscription, lifetime, source } = account;

  if (subscription?.status === "past_due") return { kind: "payment-failed" };

  if (
    source === null &&
    (subscription?.status === "incomplete" || lifetime?.status === "pending")
  ) {
    return { kind: "payment-unfinished" };
  }

  if (
    source === "subscription" &&
    subscription?.cancelAtPeriodEnd &&
    subscription.currentPeriodEnd !== null
  ) {
    const end = new Date(subscription.currentPeriodEnd);
    const left = end.getTime() - now.getTime();

    if (left > 0 && left <= ENDING_NOTICE_DAYS * DAY_MS) {
      return { kind: "ending", endsOn: formatBillingDate(end) ?? "" };
    }
  }

  return null;
};
