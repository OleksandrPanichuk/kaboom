import { getApp } from "@tests/helpers";
import { afterEach, describe, expect, test } from "bun:test";

import {
  MEMORY_SIGNATURE_HEADER,
  type MemoryWebhook,
  signMemoryWebhook,
} from "@/adapters/billing-provider/memory.billing-provider";
import { billingEventsSchema, getDatabase } from "@/db";
import {
  type BillingEventEntity,
  type BillingEventHandler,
  registerBillingEventHandler,
} from "@/modules/billing-events";

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

const signed = (body: string, signature = signMemoryWebhook(body)) =>
  post(body, { [MEMORY_SIGNATURE_HEADER]: signature });

const deliver = (event: MemoryWebhook, signature?: string) =>
  signed(JSON.stringify(event), signature);

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
  test("stores a signed event once, and ignores one no topic takes", async () => {
    const response = await deliver({
      id: "evt_1",
      type: "price.updated",
      objectId: "price_1",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, duplicate: false });
    expect(await stored()).toMatchObject([
      {
        provider: "stripe",
        providerEventId: "evt_1",
        type: "price.updated",
        topic: null,
        providerObjectId: "price_1",
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
    const garbage = await signed("not json");

    expect(forged.status).toBe(400);
    expect(await forged.json()).toMatchObject({
      code: "BILLING_WEBHOOK_INVALID",
    });
    expect(garbage.status).toBe(400);
    expect(await stored()).toEqual([]);
  });

  test("checks the signature over the body exactly as it was sent", async () => {
    const body = JSON.stringify(
      {
        id: "evt_raw",
        type: "customer.subscription.updated",
        topic: "subscription",
        objectId: "sub_1",
      },
      null,
      2,
    );
    const signature = signMemoryWebhook(body);

    expect((await signed(body, signature)).status).toBe(200);
    expect(await stored()).toMatchObject([
      { providerEventId: "evt_raw", providerObjectId: "sub_1" },
    ]);

    const reformatted = await signed(
      JSON.stringify(JSON.parse(body) as unknown),
      signature,
    );

    expect(reformatted.status).toBe(400);
  });
});
