import { createUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { makeService } from "@/core/registry";
import {
  getDatabase,
  subscriptionChangesSchema,
  subscriptionsSchema,
} from "@/db";
import type { BillingAccountModel } from "@/modules/billing-account";
import { BillingOffersService } from "@/modules/billing-offers";
import type {
  LifetimeCheckoutModel,
  SubscriptionCheckoutModel,
} from "@/modules/checkout";

import { deliverWebhook, memoryProvider, seedOffers } from "./helpers";

const buy = (user: TestUser, offer = "pro_lifetime") =>
  user.post<LifetimeCheckoutModel & { code?: string }>(
    "/api/billing/checkout/lifetime",
    { offer },
  );

const account = async (user: TestUser) =>
  (await user.get<BillingAccountModel>("/api/billing/me")).body;

let sequence = 0;

const payInvoice = async (invoiceId: string) => {
  const invoice = await memoryProvider().findInvoice(invoiceId);
  const paidAt = new Date();

  memoryProvider().setInvoice({
    ...invoice!,
    status: "paid",
    amountPaid: invoice!.total,
    amountRemaining: 0,
    paidAt,
    paymentIds: ["pi_lifetime"],
  });
  await deliverWebhook({
    id: `evt_${++sequence}`,
    type: "invoice.paid",
    topic: "invoice",
    objectId: invoiceId,
    customerId: invoice!.customerId,
  });
};

const subscribeAndPay = async (user: TestUser) => {
  await user.post<SubscriptionCheckoutModel>(
    "/api/billing/checkout/subscription",
    { offer: "pro_monthly" },
  );

  const subscription = await memoryProvider().findSubscription("sub_memory_1");

  memoryProvider().setSubscription({ ...subscription!, status: "active" });
  await deliverWebhook({
    id: `evt_${++sequence}`,
    type: "customer.subscription.updated",
    topic: "subscription",
    objectId: "sub_memory_1",
    customerId: subscription!.customerId,
  });
};

beforeEach(async () => {
  await seedOffers();
  await makeService(BillingOffersService).syncPrices();
});

describe("buying Pro for life", () => {
  test("issues an invoice to pay, the same one when asked again, and gives Pro once paid", async () => {
    const user = await createUser();
    const first = await buy(user);

    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      purchase: { status: "pending", amount: 24_900, currency: "usd" },
      clientSecret: "in_memory_1_secret_memory",
    });
    expect((await buy(user)).body.clientSecret).toBe(
      "in_memory_1_secret_memory",
    );
    expect(await account(user)).toMatchObject({ plan: "free" });

    await payInvoice("in_memory_1");

    expect(await account(user)).toMatchObject({
      plan: "pro",
      source: "lifetime",
      lifetime: { status: "paid", amount: 24_900 },
    });
  });

  test("ends a monthly subscription at once when lifetime is paid", async () => {
    const user = await createUser();

    await subscribeAndPay(user);

    const bought = await buy(user);

    expect(bought.status).toBe(200);
    expect(
      (await memoryProvider().findSubscription("sub_memory_1"))?.status,
    ).toBe("active");

    await payInvoice("in_memory_1");

    expect(
      (await memoryProvider().findSubscription("sub_memory_1"))?.status,
    ).toBe("canceled");
    expect(
      await getDatabase().select().from(subscriptionsSchema),
    ).toMatchObject([{ status: "canceled" }]);
    expect(
      (await getDatabase().select().from(subscriptionChangesSchema)).filter(
        (change) => change.kind === "canceled",
      ),
    ).toMatchObject([{ actor: "system" }]);
    expect(await account(user)).toMatchObject({
      plan: "pro",
      source: "lifetime",
      subscription: null,
    });
  });

  test("refuses a second lifetime, and a subscription on top of one", async () => {
    const user = await createUser();

    await buy(user);
    await payInvoice("in_memory_1");

    const again = await buy(user);
    const subscription = await user.post<{ code: string }>(
      "/api/billing/checkout/subscription",
      { offer: "pro_monthly" },
    );

    expect(again.status).toBe(409);
    expect(again.body.code).toBe("BILLING_ALREADY_PRO");
    expect(subscription.status).toBe(409);
  });

  test("sells for life only what is sold once", async () => {
    const response = await buy(await createUser(), "pro_monthly");

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("BILLING_OFFER_NOT_FOUND");
  });
});
