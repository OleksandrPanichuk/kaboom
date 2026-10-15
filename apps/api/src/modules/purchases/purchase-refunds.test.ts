import { describe, expect, test } from "bun:test";

import type { PurchaseStatus } from "@/db";

import type { PurchaseEntity } from "./purchase.entity";
import { purchaseAfterRefunds } from "./purchase-refunds";

const AT = new Date("2026-07-01T00:00:00Z");
const EARLIER = new Date("2026-06-15T00:00:00Z");

const purchase = (
  status: PurchaseStatus,
  overrides: Partial<PurchaseEntity> = {},
): PurchaseEntity => ({
  id: "00000000-0000-4000-8000-000000000001",
  userId: null,
  provider: "stripe",
  providerCustomerId: "cus_1",
  providerPriceId: "price_lifetime",
  providerInvoiceId: "in_1",
  providerPaymentId: "pi_1",
  status,
  amount: 24_900,
  amountRefunded: 0,
  currency: "usd",
  paidAt: EARLIER,
  refundedAt: null,
  createdAt: EARLIER,
  updatedAt: EARLIER,
  ...overrides,
});

const after = (
  current: PurchaseEntity,
  refunded?: number,
  disputeLost?: boolean,
) => purchaseAfterRefunds(current, { refunded, disputeLost }, AT);

describe("a purchase after its refunds", () => {
  test("part of the amount back is a partial refund", () => {
    expect(after(purchase("paid"), 10_000)).toEqual({
      status: "partially_refunded",
      amountRefunded: 10_000,
      refundedAt: null,
    });
  });

  test("all of it back is a refund, which ends lifetime access", () => {
    expect(after(purchase("partially_refunded"), 24_900)).toEqual({
      status: "refunded",
      amountRefunded: 24_900,
      refundedAt: AT,
    });
  });

  test("a lost dispute ends it, keeping what was refunded", () => {
    expect(
      after(
        purchase("partially_refunded", { amountRefunded: 5_000 }),
        undefined,
        true,
      ),
    ).toEqual({
      status: "refunded",
      amountRefunded: 5_000,
      refundedAt: AT,
    });
  });

  test("a refunded purchase stays refunded, from when it was", () => {
    expect(
      after(
        purchase("refunded", { refundedAt: EARLIER, amountRefunded: 0 }),
        0,
      ),
    ).toEqual({ status: "refunded", amountRefunded: 0, refundedAt: EARLIER });
  });

  test("a partial refund that failed leaves the purchase paid", () => {
    expect(
      after(purchase("partially_refunded", { amountRefunded: 10_000 }), 0),
    ).toMatchObject({ status: "paid", amountRefunded: 0 });
  });

  test("a purchase never paid has nothing to refund", () => {
    expect(after(purchase("pending"), 24_900)).toBeNull();
    expect(after(purchase("canceled"), 24_900, true)).toBeNull();
  });
});
