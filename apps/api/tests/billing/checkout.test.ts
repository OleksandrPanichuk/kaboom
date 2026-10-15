import { createUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { makeService } from "@/core/registry";
import { getDatabase, subscriptionChangesSchema } from "@/db";
import type { BillingAccountModel } from "@/modules/billing-account";
import { BillingOffersService } from "@/modules/billing-offers";
import type { SubscriptionCheckoutModel } from "@/modules/checkout";
import type { SubscriptionModel } from "@/modules/subscriptions";

import { deliverWebhook, memoryProvider, seedOffers } from "./helpers";

const subscribe = (user: TestUser, offer = "pro_monthly") =>
  user.post<SubscriptionCheckoutModel & { code?: string }>(
    "/api/billing/checkout/subscription",
    { offer },
  );

const pay = async (subscriptionId: string) => {
  const subscription = await memoryProvider().findSubscription(subscriptionId);

  memoryProvider().setSubscription({ ...subscription!, status: "active" });
  await deliverWebhook({
    id: `evt_paid_${subscriptionId}`,
    type: "customer.subscription.updated",
    topic: "subscription",
    objectId: subscriptionId,
    customerId: subscription!.customerId,
  });
};

const changes = () => getDatabase().select().from(subscriptionChangesSchema);

beforeEach(async () => {
  await seedOffers();
  await makeService(BillingOffersService).syncPrices();
});

describe("subscribing", () => {
  test("starts a subscription waiting for its first payment, and answers the same payment when asked again", async () => {
    const user = await createUser();
    const first = await subscribe(user);

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      subscription: { status: "incomplete", cancelAtPeriodEnd: false },
      clientSecret: "sub_memory_1_secret_memory",
    });

    const again = await subscribe(user);

    expect(again.body.clientSecret).toBe("sub_memory_1_secret_memory");
    expect(await changes()).toMatchObject([
      { kind: "created", actor: "user", actorUserId: user.id },
    ]);
  });

  test("is Pro once the payment goes through, and cannot subscribe twice", async () => {
    const user = await createUser();

    await subscribe(user);
    await pay("sub_memory_1");

    expect(
      (await user.get<BillingAccountModel>("/api/billing/me")).body,
    ).toMatchObject({ plan: "pro", source: "subscription" });

    const twice = await subscribe(user);

    expect(twice.status).toBe(409);
    expect(twice.body.code).toBe("BILLING_ALREADY_PRO");
  });

  test("subscribes only to what is sold as a subscription", async () => {
    const user = await createUser();

    for (const offer of ["pro_lifetime", "pro_weekly"]) {
      const response = await subscribe(user, offer);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("BILLING_OFFER_NOT_FOUND");
    }
  });

  test("asks for a billing address first when tax is collected", async () => {
    const user = await createUser();

    memoryProvider().collectsTax = true;

    const response = await subscribe(user);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("BILLING_ADDRESS_REQUIRED");
  });
});

describe("cancelling and resuming", () => {
  const cancel = (user: TestUser) =>
    user.post<SubscriptionModel & { code?: string }>(
      "/api/billing/subscription/cancel",
    );
  const resume = (user: TestUser) =>
    user.post<SubscriptionModel>("/api/billing/subscription/resume");

  test("cancels at the end of the period and can be taken back", async () => {
    const user = await createUser();

    await subscribe(user);
    await pay("sub_memory_1");

    const cancelled = await cancel(user);

    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({
      status: "active",
      cancelAtPeriodEnd: true,
    });

    const resumed = await resume(user);

    expect(resumed.body).toMatchObject({
      status: "active",
      cancelAtPeriodEnd: false,
    });
    expect(
      (await changes())
        .filter((change) => change.actor === "user")
        .map((change) => change.kind),
    ).toEqual(["created", "cancel_scheduled", "cancel_unscheduled"]);
  });

  test("a subscription never paid for ends at once", async () => {
    const user = await createUser();

    await subscribe(user);

    expect((await cancel(user)).body.status).toBe("incomplete_expired");
    expect(
      (await user.get<BillingAccountModel>("/api/billing/me")).body
        .subscription,
    ).toBeNull();
  });

  test("there is nothing to cancel without a subscription", async () => {
    const response = await cancel(await createUser());

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("SUBSCRIPTION_NOT_FOUND");
  });
});
