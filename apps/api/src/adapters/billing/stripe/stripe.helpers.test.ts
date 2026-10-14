import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";

import { toProviderPrice } from "./stripe.helpers";

const price = (overrides: Partial<Stripe.Price>): Stripe.Price =>
  ({
    id: "price_1",
    object: "price",
    active: true,
    currency: "eur",
    lookup_key: "pro_monthly",
    recurring: {
      interval: "month",
      interval_count: 1,
      meter: null,
      trial_period_days: null,
      usage_type: "licensed",
    },
    tax_behavior: "inclusive",
    type: "recurring",
    unit_amount: 999,
    ...overrides,
  }) as Stripe.Price;

describe("reading a Stripe price", () => {
  test("keeps what a subscription is billed by", () => {
    expect(toProviderPrice(price({}))).toEqual({
      id: "price_1",
      lookupKey: "pro_monthly",
      type: "recurring",
      interval: "month",
      intervalCount: 1,
      unitAmount: 999,
      currency: "eur",
      taxBehavior: "inclusive",
      active: true,
    });
  });

  test("reads a one-time price without an interval, and an unset tax behaviour", () => {
    expect(
      toProviderPrice(
        price({ type: "one_time", recurring: null, tax_behavior: null }),
      ),
    ).toMatchObject({
      type: "one_time",
      interval: null,
      intervalCount: null,
      taxBehavior: "unspecified",
    });
  });

  test("refuses a price with no flat amount", () => {
    expect(() => toProviderPrice(price({ unit_amount: null }))).toThrow(
      "only flat prices are supported",
    );
  });
});
