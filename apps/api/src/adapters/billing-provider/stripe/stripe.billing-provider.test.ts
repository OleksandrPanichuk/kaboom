import { describe, expect, test } from "bun:test";
import Stripe from "stripe";

import { InvalidBillingWebhookError } from "@/modules/billing-provider/billing-provider.errors";

import { StripeBillingProvider } from "./stripe.billing-provider";

const SECRET = "whsec_unit";

const provider = new StripeBillingProvider({
  secretKey: "sk_test_unused",
  webhookSecret: SECRET,
  appName: "Test",
});

const signed = async (event: Record<string, unknown>) => {
  const payload = JSON.stringify({
    id: "evt_1",
    object: "event",
    created: 1_791_000_000,
    livemode: true,
    data: { object: { id: "in_1", object: "invoice" } },
    ...event,
  });

  return {
    payload,
    signature: await new Stripe(
      "sk_test_unused",
    ).webhooks.generateTestHeaderStringAsync({ payload, secret: SECRET }),
  };
};

describe("reading a Stripe webhook", () => {
  test("sorts a known event into its topic", async () => {
    const { payload, signature } = await signed({
      type: "invoice_payment.paid",
    });

    expect(await provider.parseWebhook(payload, signature)).toMatchObject({
      id: "evt_1",
      type: "invoice_payment.paid",
      topic: "invoice",
      objectId: "in_1",
      live: true,
      createdAt: new Date(1_791_000_000_000),
    });
  });

  test("leaves an event nothing listens for without a topic", async () => {
    const { payload, signature } = await signed({ type: "product.created" });

    expect((await provider.parseWebhook(payload, signature)).topic).toBeNull();
  });

  test("refuses a missing or wrong signature", async () => {
    const { payload } = await signed({ type: "invoice.paid" });
    const refusal = (signature: string | null) =>
      provider.parseWebhook(payload, signature).then(
        () => null,
        (error: unknown) => error,
      );

    expect(await refusal(null)).toBeInstanceOf(InvalidBillingWebhookError);
    expect(await refusal("t=1,v1=abc")).toBeInstanceOf(
      InvalidBillingWebhookError,
    );
  });
});
