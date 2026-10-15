import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { make } from "@/core/registry";
import { billingEventsSchema, getDatabase, subscriptionsSchema } from "@/db";
import type { ProviderEvent } from "@/modules/billing-provider";
import { ReconcileBillingJob } from "@/modules/billing-reconciliation";

import {
  deliverWebhook,
  memoryProvider,
  providerCustomer,
  providerSubscription,
} from "./helpers";

const HOUR = 60 * 60 * 1_000;

const subscriptionEvent = (id: string, hoursAgo: number): ProviderEvent => ({
  id,
  type: "customer.subscription.updated",
  topic: "subscription",
  objectId: "sub_1",
  customerId: "cus_1",
  live: false,
  createdAt: new Date(Date.now() - hoursAgo * HOUR),
  payload: { id },
});

const reconcile = () => make(ReconcileBillingJob).handle();

const events = () => getDatabase().select().from(billingEventsSchema);

const subscriptions = () => getDatabase().select().from(subscriptionsSchema);

describe("reconciling billing with the provider", () => {
  test("processes an event whose webhook never arrived", async () => {
    memoryProvider().setCustomer(providerCustomer());
    memoryProvider().setSubscription(providerSubscription());
    memoryProvider().setEvents([subscriptionEvent("evt_missed", 3)]);

    await reconcile();

    expect(await events()).toMatchObject([
      { providerEventId: "evt_missed", status: "processed" },
    ]);
    expect(await subscriptions()).toMatchObject([
      { providerSubscriptionId: "sub_1", status: "active" },
    ]);
  });

  test("leaves events it already processed alone", async () => {
    memoryProvider().setCustomer(providerCustomer());
    memoryProvider().setSubscription(providerSubscription());
    await deliverWebhook({
      id: "evt_seen",
      type: "customer.subscription.updated",
      topic: "subscription",
      objectId: "sub_1",
      customerId: "cus_1",
    });
    memoryProvider().setEvents([subscriptionEvent("evt_seen", 1)]);

    await reconcile();

    expect(await events()).toMatchObject([
      { providerEventId: "evt_seen", status: "processed", attempts: 1 },
    ]);
  });

  test("tries an event that failed every attempt once more", async () => {
    memoryProvider().setCustomer(providerCustomer());
    await deliverWebhook({
      id: "evt_failed",
      type: "customer.subscription.updated",
      topic: "subscription",
      objectId: "sub_1",
      customerId: "cus_1",
    });

    const [failed] = await events();

    expect(failed?.status).toBe("failed");

    memoryProvider().setSubscription(providerSubscription());
    memoryProvider().setEvents([subscriptionEvent("evt_failed", 1)]);
    await reconcile();

    const [retried] = await getDatabase()
      .select()
      .from(billingEventsSchema)
      .where(eq(billingEventsSchema.providerEventId, "evt_failed"));

    expect(retried).toMatchObject({ status: "processed", lastError: null });
    expect(retried!.attempts).toBeGreaterThan(failed!.attempts);
    expect(await subscriptions()).toHaveLength(1);
  });

  test("looks back two days and no further", async () => {
    memoryProvider().setCustomer(providerCustomer());
    memoryProvider().setSubscription(providerSubscription());
    memoryProvider().setEvents([subscriptionEvent("evt_old", 49)]);

    await reconcile();

    expect(await events()).toEqual([]);
  });
});
