import { createUser, inbox, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { makeService } from "@/core/registry";
import { BillingOffersService } from "@/modules/billing-offers";
import type { ProviderSubscription } from "@/modules/billing-provider";

import {
  deliverWebhook,
  memoryProvider,
  providerRefund,
  seedOffers,
} from "./helpers";

let sequence = 0;

const subjects = (user: TestUser) =>
  inbox.for(user.email).map((message) => message.subject);

const setSubscription = async (changes: Partial<ProviderSubscription>) => {
  const subscription = await memoryProvider().findSubscription("sub_memory_1");

  memoryProvider().setSubscription({ ...subscription!, ...changes });
  await deliverWebhook({
    id: `evt_${++sequence}`,
    type: "customer.subscription.updated",
    topic: "subscription",
    objectId: "sub_memory_1",
    customerId: subscription!.customerId,
  });
};

const subscribe = (user: TestUser) =>
  user.post("/api/billing/checkout/subscription", { offer: "pro_monthly" });

const payLifetime = async (user: TestUser) => {
  await user.post("/api/billing/checkout/lifetime", { offer: "pro_lifetime" });

  const invoice = await memoryProvider().findInvoice("in_memory_1");

  memoryProvider().setInvoice({
    ...invoice!,
    status: "paid",
    amountPaid: invoice!.total,
    amountRemaining: 0,
    paidAt: new Date(),
    paymentIds: ["pi_lifetime"],
  });
  await deliverWebhook({
    id: `evt_${++sequence}`,
    type: "invoice.paid",
    topic: "invoice",
    objectId: "in_memory_1",
    customerId: invoice!.customerId,
  });
};

beforeEach(async () => {
  await seedOffers();
  await makeService(BillingOffersService).syncPrices();
});

describe("billing emails", () => {
  test("a subscription that starts, fails to renew and ends sends one email for each, once", async () => {
    const user = await createUser();

    await subscribe(user);

    expect(subjects(user)).not.toContain("Your Pro subscription has started");

    await setSubscription({ status: "active" });
    await setSubscription({ status: "active" });
    await setSubscription({ status: "past_due" });
    await setSubscription({
      status: "canceled",
      endedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const sent = subjects(user);

    expect(
      sent.filter((subject) => subject === "Your Pro subscription has started"),
    ).toHaveLength(1);
    expect(sent).toContain("We could not take your payment");
    expect(sent).toContain("Your Pro subscription has ended");
    expect(inbox.lastFor(user.email).text).toContain("July 1, 2026");
    expect(inbox.lastFor(user.email).text).toContain("/settings/billing");
  });

  test("lifetime sends its own welcome, and not that the monthly plan ended", async () => {
    const user = await createUser();

    await subscribe(user);
    await setSubscription({ status: "active" });
    await payLifetime(user);

    const sent = subjects(user);

    expect(sent).toContain("You have Pro for life");
    expect(sent).not.toContain("Your Pro subscription has ended");
  });

  test("a full refund of lifetime says what comes back", async () => {
    const user = await createUser();

    await payLifetime(user);

    memoryProvider().setRefund(
      providerRefund({
        customerId: "cus_memory_1",
        paymentId: "pi_lifetime",
        invoiceId: "in_memory_1",
        creditNoteId: null,
      }),
    );
    await deliverWebhook({
      id: "evt_refund",
      type: "refund.updated",
      topic: "refund",
      objectId: "re_1",
      customerId: "cus_memory_1",
    });

    expect(inbox.lastFor(user.email)).toMatchObject({
      subject: "Your purchase was refunded",
    });
    expect(inbox.lastFor(user.email).text).toContain("$249.00");
  });

  test("nothing is sent for a change that is rolled back", async () => {
    const user = await createUser();

    await subscribe(user);

    const before = subjects(user).length;
    const subscription =
      await memoryProvider().findSubscription("sub_memory_1");

    memoryProvider().setSubscription({
      ...subscription!,
      id: "sub_other",
      status: "active",
    });
    memoryProvider().setSubscription({ ...subscription!, status: "active" });
    await deliverWebhook({
      id: "evt_conflict",
      type: "customer.subscription.updated",
      topic: "subscription",
      objectId: "sub_other",
      customerId: subscription!.customerId,
    });

    expect(subjects(user)).toHaveLength(before);
  });
});
