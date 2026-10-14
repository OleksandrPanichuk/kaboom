import { getApp } from "@tests/helpers";
import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

import {
  MEMORY_SIGNATURE_HEADER,
  MEMORY_WEBHOOK_SIGNATURE,
  type MemoryWebhook,
} from "@/adapters/billing/memory.billing-provider";
import { StripeBillingProvider } from "@/adapters/billing/stripe";
import { bind, make } from "@/core/registry";
import { billingEventsSchema, getDatabase } from "@/db";
import {
  type BillingEventEntity,
  type BillingEventHandler,
  BillingProvider,
  registerBillingEventHandler,
} from "@/modules/billing";

const ORIGIN = "http://localhost:3000";

const post = (body: string, headers: Record<string, string>) =>
  getApp().handle(
    new Request(`${ORIGIN}/api/billing/webhooks/stripe`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...headers,
      },
      body,
    }),
  );

const deliver = (
  event: MemoryWebhook,
  signature: string = MEMORY_WEBHOOK_SIGNATURE,
) => post(JSON.stringify(event), { [MEMORY_SIGNATURE_HEADER]: signature });

const stored = () => getDatabase().select().from(billingEventsSchema);

const seen: BillingEventEntity[] = [];
let failing = false;

class RecordingHandler implements BillingEventHandler {
  public handle(event: BillingEventEntity): Promise<void> {
    if (failing) return Promise.reject(new Error("the provider is down"));

    seen.push(event);

    return Promise.resolve();
  }
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  seen.length = 0;
  failing = false;
});

describe("receiving billing webhooks", () => {
  test("stores a signed event once, and ignores a topic nothing handles", async () => {
    const response = await deliver({
      id: "evt_1",
      type: "invoice.paid",
      topic: "invoice",
      objectId: "in_1",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, duplicate: false });
    expect(await stored()).toMatchObject([
      {
        provider: "stripe",
        providerEventId: "evt_1",
        type: "invoice.paid",
        topic: "invoice",
        providerObjectId: "in_1",
        status: "ignored",
        attempts: 1,
      },
    ]);
  });

  test("hands an event to the handler of its topic", async () => {
    cleanups.push(registerBillingEventHandler("invoice", RecordingHandler));

    await deliver({ id: "evt_2", type: "invoice.paid", topic: "invoice" });

    expect(seen.map((event) => event.providerEventId)).toEqual(["evt_2"]);
    expect((await stored())[0]).toMatchObject({
      status: "processed",
      lastError: null,
    });
  });

  test("acknowledges a redelivered event without handling it twice", async () => {
    cleanups.push(registerBillingEventHandler("invoice", RecordingHandler));

    await deliver({ id: "evt_3", type: "invoice.paid", topic: "invoice" });
    const again = await deliver({
      id: "evt_3",
      type: "invoice.paid",
      topic: "invoice",
    });

    expect(await again.json()).toEqual({ received: true, duplicate: true });
    expect(seen).toHaveLength(1);
    expect(await stored()).toHaveLength(1);
  });

  test("keeps a failed event, and handles it when it is delivered again", async () => {
    cleanups.push(registerBillingEventHandler("invoice", RecordingHandler));
    failing = true;

    const first = await deliver({
      id: "evt_4",
      type: "invoice.paid",
      topic: "invoice",
    });

    expect(first.status).toBe(200);
    expect((await stored())[0]).toMatchObject({
      status: "failed",
      lastError: "the provider is down",
    });

    failing = false;
    await deliver({ id: "evt_4", type: "invoice.paid", topic: "invoice" });

    expect((await stored())[0]).toMatchObject({
      status: "processed",
      attempts: 2,
      lastError: null,
    });
  });

  test("refuses an unsigned or malformed event and stores nothing", async () => {
    const forged = await deliver({ id: "evt_5", type: "invoice.paid" }, "nope");
    const garbage = await post("not json", {
      [MEMORY_SIGNATURE_HEADER]: MEMORY_WEBHOOK_SIGNATURE,
    });

    expect(forged.status).toBe(400);
    expect(await forged.json()).toMatchObject({
      code: "BILLING_WEBHOOK_INVALID",
    });
    expect(garbage.status).toBe(400);
    expect(await stored()).toEqual([]);
  });

  test("verifies Stripe's signature over the body exactly as it was sent", async () => {
    const memory = make(BillingProvider);
    const secret = "whsec_test_secret";

    bind(
      BillingProvider,
      () =>
        new StripeBillingProvider({
          secretKey: "sk_test_unused",
          webhookSecret: secret,
          appName: "Test",
        }),
    );
    cleanups.push(() => bind(BillingProvider, () => memory));

    const payload = JSON.stringify(
      {
        id: "evt_stripe_1",
        object: "event",
        type: "customer.subscription.updated",
        created: 1_791_000_000,
        livemode: false,
        data: { object: { id: "sub_1", object: "subscription" } },
      },
      null,
      2,
    );
    const signature = await new Stripe(
      "sk_test_unused",
    ).webhooks.generateTestHeaderStringAsync({ payload, secret });

    const response = await post(payload, { "stripe-signature": signature });

    expect(response.status).toBe(200);

    const [event] = await getDatabase()
      .select()
      .from(billingEventsSchema)
      .where(eq(billingEventsSchema.providerEventId, "evt_stripe_1"));

    expect(event).toMatchObject({
      topic: "subscription",
      providerObjectId: "sub_1",
      live: false,
      providerCreatedAt: new Date(1_791_000_000_000),
    });

    const tampered = await post(payload.replace("sub_1", "sub_2"), {
      "stripe-signature": signature,
    });

    expect(tampered.status).toBe(400);
  });
});
