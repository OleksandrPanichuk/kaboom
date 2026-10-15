import { describe, expect, test } from "bun:test";

import type { BillingAccount } from "@/features/billing/api";

import { billingNotice } from "./billingNotice";

const NOW = new Date("2026-10-15T12:00:00Z");

const account = (overrides: Partial<BillingAccount>): BillingAccount => ({
  plan: "free",
  source: null,
  subscription: null,
  lifetime: null,
  customer: null,
  ...overrides,
});

const subscription = (
  overrides: Partial<NonNullable<BillingAccount["subscription"]>>,
): NonNullable<BillingAccount["subscription"]> => ({
  status: "active",
  currentPeriodEnd: "2026-10-20T12:00:00.000Z",
  cancelAtPeriodEnd: false,
  cancelAt: null,
  trialEnd: null,
  ...overrides,
});

describe("the billing banner", () => {
  test("says nothing to someone on Free or with nothing to do", () => {
    expect(billingNotice(account({}), NOW)).toBeNull();
    expect(
      billingNotice(
        account({
          plan: "pro",
          source: "subscription",
          subscription: subscription({}),
        }),
        NOW,
      ),
    ).toBeNull();
  });

  test("asks for another card when a renewal failed", () => {
    expect(
      billingNotice(
        account({
          plan: "pro",
          source: "subscription",
          subscription: subscription({ status: "past_due" }),
        }),
        NOW,
      ),
    ).toEqual({ kind: "payment-failed" });
  });

  test("reminds someone who left a payment unfinished", () => {
    expect(
      billingNotice(
        account({ subscription: subscription({ status: "incomplete" }) }),
        NOW,
      ),
    ).toEqual({ kind: "payment-unfinished" });
  });

  test("warns in the last week before a cancelled subscription ends, and not before", () => {
    const ending = (currentPeriodEnd: string) =>
      billingNotice(
        account({
          plan: "pro",
          source: "subscription",
          subscription: subscription({
            cancelAtPeriodEnd: true,
            currentPeriodEnd,
          }),
        }),
        NOW,
      );

    expect(ending("2026-10-20T12:00:00.000Z")).toEqual({
      kind: "ending",
      endsOn: "Oct 20, 2026",
    });
    expect(ending("2026-11-15T00:00:00.000Z")).toBeNull();
  });
});
