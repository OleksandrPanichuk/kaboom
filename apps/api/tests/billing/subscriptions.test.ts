import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";
import { asc, eq } from "drizzle-orm";

import {
  billingEventsSchema,
  getDatabase,
  subscriptionChangesSchema,
  subscriptionsSchema,
} from "@/db";
import type { ProviderSubscription } from "@/modules/billing-provider";

import {
  deliverWebhook,
  memoryProvider,
  PERIOD_END,
  providerCustomer,
  providerSubscription,
} from "./helpers";

const subscriptions = () =>
  getDatabase()
    .select()
    .from(subscriptionsSchema)
    .orderBy(asc(subscriptionsSchema.providerSubscriptionId));

const changes = () =>
  getDatabase()
    .select()
    .from(subscriptionChangesSchema)
    .orderBy(
      asc(subscriptionChangesSchema.effectiveAt),
      asc(subscriptionChangesSchema.kind),
    );

const AUGUST = new Date("2026-08-01T00:00:00Z");

let sequence = 0;

const deliver = (
  subscription: ProviderSubscription,
  type = "customer.subscription.updated",
) => {
  memoryProvider().setSubscription(subscription);

  return deliverWebhook({
    id: `evt_${++sequence}`,
    type,
    topic: "subscription",
    objectId: subscription.id,
    customerId: subscription.customerId,
  });
};

const eventStatus = async () =>
  (await getDatabase().select().from(billingEventsSchema)).map(
    (event) => event.status,
  );

describe("syncing subscriptions", () => {
  test("copies a new subscription to the customer's user and records its creation", async () => {
    const user = await createUser();

    memoryProvider().setCustomer(providerCustomer({ userId: user.id }));
    await deliver(providerSubscription(), "customer.subscription.created");

    expect(await subscriptions()).toMatchObject([
      {
        userId: user.id,
        providerSubscriptionId: "sub_1",
        providerCustomerId: "cus_1",
        providerPriceId: "price_memory_pro_monthly",
        status: "active",
        currentPeriodEnd: PERIOD_END,
      },
    ]);
    expect(await changes()).toMatchObject([
      {
        kind: "created",
        toStatus: "active",
        toProviderPriceId: "price_memory_pro_monthly",
        actor: "provider",
      },
    ]);
  });

  test("records each change once, however often it is delivered", async () => {
    memoryProvider().setCustomer(providerCustomer());
    await deliver(providerSubscription());
    await deliver(providerSubscription({ cancelAtPeriodEnd: true }));
    await deliver(providerSubscription({ cancelAtPeriodEnd: true }));

    expect((await changes()).map((change) => change.kind)).toEqual([
      "created",
      "cancel_scheduled",
    ]);
  });

  test("an event that arrives late changes nothing the provider has moved past", async () => {
    memoryProvider().setCustomer(providerCustomer());
    await deliver(providerSubscription());

    const renewed = providerSubscription({
      currentPeriodStart: PERIOD_END,
      currentPeriodEnd: AUGUST,
    });

    await deliver(renewed);
    await deliverWebhook({
      id: "evt_stale",
      type: "customer.subscription.updated",
      topic: "subscription",
      objectId: "sub_1",
      customerId: "cus_1",
    });

    expect((await subscriptions())[0]?.currentPeriodStart).toEqual(PERIOD_END);
    expect((await changes()).map((change) => change.kind)).toEqual([
      "created",
      "renewed",
    ]);
  });

  test("a cancellation is recorded when the subscription ended", async () => {
    memoryProvider().setCustomer(providerCustomer());
    await deliver(providerSubscription());
    await deliver(
      providerSubscription({ status: "canceled", endedAt: PERIOD_END }),
      "customer.subscription.deleted",
    );

    expect(await changes()).toMatchObject([
      { kind: "created" },
      {
        kind: "canceled",
        fromStatus: "active",
        toStatus: "canceled",
        effectiveAt: PERIOD_END,
      },
    ]);
  });

  test("a new subscription settles the customer's old one first", async () => {
    memoryProvider().setCustomer(providerCustomer());
    await deliver(providerSubscription());

    memoryProvider().setSubscription(
      providerSubscription({ status: "canceled", endedAt: PERIOD_END }),
    );
    await deliver(providerSubscription({ id: "sub_2" }));

    expect(
      (await subscriptions()).map(({ providerSubscriptionId, status }) => ({
        providerSubscriptionId,
        status,
      })),
    ).toEqual([
      { providerSubscriptionId: "sub_1", status: "canceled" },
      { providerSubscriptionId: "sub_2", status: "active" },
    ]);
    expect(await eventStatus()).toEqual(["processed", "processed"]);
  });

  test("refuses a second live subscription and keeps the event to try again", async () => {
    memoryProvider().setCustomer(providerCustomer());
    await deliver(providerSubscription());
    await deliver(providerSubscription({ id: "sub_2" }));

    const [, second] = await getDatabase()
      .select()
      .from(billingEventsSchema)
      .orderBy(asc(billingEventsSchema.receivedAt));

    expect(second).toMatchObject({ status: "failed" });
    expect(second?.lastError).toContain("two live subscriptions");
    expect(
      await getDatabase()
        .select()
        .from(subscriptionsSchema)
        .where(eq(subscriptionsSchema.providerSubscriptionId, "sub_2")),
    ).toEqual([]);
  });
});
