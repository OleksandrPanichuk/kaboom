import { describe, expect, test } from "bun:test";

import { planOf } from "./billing-plan";

describe("the plan an account is on", () => {
  test("nothing bought is Free", () => {
    expect(planOf({ subscription: null, purchase: null })).toEqual({
      plan: "free",
      source: null,
    });
  });

  test("a subscription gives Pro while it is paid for or being retried", () => {
    for (const status of ["active", "trialing", "past_due"] as const) {
      expect(planOf({ subscription: { status }, purchase: null })).toEqual({
        plan: "pro",
        source: "subscription",
      });
    }

    for (const status of ["incomplete", "unpaid", "paused"] as const) {
      expect(planOf({ subscription: { status }, purchase: null }).plan).toBe(
        "free",
      );
    }
  });

  test("lifetime gives Pro until it is refunded, and wins over a subscription", () => {
    expect(
      planOf({
        subscription: { status: "active" },
        purchase: { status: "partially_refunded" },
      }),
    ).toEqual({ plan: "pro", source: "lifetime" });
    expect(
      planOf({ subscription: null, purchase: { status: "pending" } }).plan,
    ).toBe("free");
  });
});
