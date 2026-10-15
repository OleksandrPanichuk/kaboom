import { describe, expect, test } from "bun:test";

import type { ProviderSubscription } from "@/modules/billing-provider";

import type { SubscriptionEntity } from "./subscription.entity";
import { subscriptionChanges } from "./subscription-changes";

const JUNE = new Date("2026-06-01T00:00:00Z");
const JULY = new Date("2026-07-01T00:00:00Z");
const AUGUST = new Date("2026-08-01T00:00:00Z");
const EVENT_AT = new Date("2026-06-15T12:00:00Z");

const fetched = (
  overrides: Partial<ProviderSubscription> = {},
): ProviderSubscription => ({
  id: "sub_1",
  customerId: "cus_1",
  priceId: "price_monthly",
  status: "active",
  quantity: 1,
  currentPeriodStart: JUNE,
  currentPeriodEnd: JULY,
  cancelAtPeriodEnd: false,
  cancelAt: null,
  canceledAt: null,
  cancellationReason: null,
  endedAt: null,
  trialStart: null,
  trialEnd: null,
  latestInvoiceId: "in_1",
  createdAt: JUNE,
  ...overrides,
});

const stored = (
  overrides: Partial<ProviderSubscription> = {},
): SubscriptionEntity => {
  const subscription = fetched(overrides);

  return {
    id: "00000000-0000-4000-8000-000000000001",
    userId: null,
    provider: "stripe",
    providerSubscriptionId: subscription.id,
    providerCustomerId: subscription.customerId,
    providerPriceId: subscription.priceId,
    status: subscription.status,
    quantity: subscription.quantity,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    cancelAt: subscription.cancelAt,
    canceledAt: subscription.canceledAt,
    cancellationReason: subscription.cancellationReason,
    endedAt: subscription.endedAt,
    trialStart: subscription.trialStart,
    trialEnd: subscription.trialEnd,
    latestProviderInvoiceId: subscription.latestInvoiceId,
    providerCreatedAt: subscription.createdAt,
    syncedAt: JUNE,
    createdAt: JUNE,
    updatedAt: JUNE,
  };
};

const kinds = (
  before: SubscriptionEntity | null,
  after: ProviderSubscription,
) => subscriptionChanges(before, after, EVENT_AT).map((change) => change.kind);

describe("what changed in a subscription", () => {
  test("a subscription seen for the first time was created when the provider made it", () => {
    expect(subscriptionChanges(null, fetched(), EVENT_AT)).toEqual([
      {
        kind: "created",
        fromStatus: null,
        toStatus: "active",
        fromProviderPriceId: null,
        toProviderPriceId: "price_monthly",
        fromQuantity: null,
        toQuantity: 1,
        effectiveAt: JUNE,
      },
    ]);
  });

  test("one first seen already canceled was created and canceled", () => {
    expect(kinds(null, fetched({ status: "canceled", endedAt: JULY }))).toEqual(
      ["created", "canceled"],
    );
  });

  test("nothing changed when the provider answers what is stored", () => {
    expect(kinds(stored(), fetched())).toEqual([]);
  });

  test("a new price is a plan change, and a new quantity is its own", () => {
    expect(
      subscriptionChanges(
        stored(),
        fetched({ priceId: "price_yearly", quantity: 2 }),
        EVENT_AT,
      ),
    ).toMatchObject([
      {
        kind: "plan_changed",
        fromProviderPriceId: "price_monthly",
        toProviderPriceId: "price_yearly",
        effectiveAt: EVENT_AT,
      },
      { kind: "quantity_changed", fromQuantity: 1, toQuantity: 2 },
    ]);
  });

  test("names a status change by where it went", () => {
    expect(
      subscriptionChanges(stored(), fetched({ status: "past_due" }), EVENT_AT),
    ).toMatchObject([
      { kind: "status_changed", fromStatus: "active", toStatus: "past_due" },
    ]);
    expect(kinds(stored(), fetched({ status: "paused" }))).toEqual(["paused"]);
    expect(kinds(stored({ status: "paused" }), fetched())).toEqual(["resumed"]);
  });

  test("a cancellation takes effect when the subscription ended", () => {
    expect(
      subscriptionChanges(
        stored({ cancelAtPeriodEnd: true }),
        fetched({ status: "canceled", canceledAt: JUNE, endedAt: JULY }),
        EVENT_AT,
      ),
    ).toMatchObject([{ kind: "canceled", effectiveAt: JULY }]);
  });

  test("scheduling and unscheduling a cancellation", () => {
    expect(kinds(stored(), fetched({ cancelAtPeriodEnd: true }))).toEqual([
      "cancel_scheduled",
    ]);
    expect(kinds(stored(), fetched({ cancelAt: AUGUST }))).toEqual([
      "cancel_scheduled",
    ]);
    expect(kinds(stored({ cancelAtPeriodEnd: true }), fetched())).toEqual([
      "cancel_unscheduled",
    ]);
  });

  test("a later period is a renewal, effective when it started", () => {
    expect(
      subscriptionChanges(
        stored(),
        fetched({ currentPeriodStart: JULY, currentPeriodEnd: AUGUST }),
        EVENT_AT,
      ),
    ).toMatchObject([{ kind: "renewed", effectiveAt: JULY }]);
  });

  test("an older copy of the subscription is not a renewal backwards", () => {
    expect(
      kinds(
        stored({ currentPeriodStart: JULY, currentPeriodEnd: AUGUST }),
        fetched(),
      ),
    ).toEqual([]);
  });
});
