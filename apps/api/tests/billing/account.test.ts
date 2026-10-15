import { createGuest, createUser, DEFAULT_PASSWORD } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { makeService } from "@/core/registry";
import { billingCustomersSchema, getDatabase } from "@/db";
import type { BillingAccountModel } from "@/modules/billing-account";
import { BillingCustomersService } from "@/modules/billing-customers";
import { BillingOffersService } from "@/modules/billing-offers";
import type { InvoiceModel } from "@/modules/invoices";
import type { PaymentModel } from "@/modules/payments";
import type { SubscriptionChangeModel } from "@/modules/subscriptions";

import {
  deliverWebhook,
  memoryProvider,
  PAID_LIFETIME,
  PERIOD_END,
  providerInvoice,
  providerPayment,
  providerSubscription,
  seedOffers,
} from "./helpers";

interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

let sequence = 0;

const deliver = (
  topic: "subscription" | "invoice" | "payment",
  objectId: string,
  customerId: string,
) =>
  deliverWebhook({
    id: `evt_${++sequence}`,
    type: `${topic}.updated`,
    topic,
    objectId,
    customerId,
  });

const customerFor = async (user: { id: string; email: string }) =>
  (
    await makeService(BillingCustomersService).forUser({
      id: user.id,
      email: user.email,
      name: "Ada",
    })
  ).providerCustomerId;

beforeEach(async () => {
  await seedOffers();
  await makeService(BillingOffersService).syncPrices();
});

describe("your billing account", () => {
  test("someone who bought nothing is on Free with nothing at the provider", async () => {
    const user = await createUser();
    const response = await user.get<BillingAccountModel>("/api/billing/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      plan: "free",
      source: null,
      subscription: null,
      lifetime: null,
      customer: null,
    });
    expect((await createGuest().get("/api/billing/me")).status).toBe(401);
  });

  test("a subscription gives Pro, and its end is shown once it is scheduled", async () => {
    const user = await createUser();
    const customerId = await customerFor(user);

    memoryProvider().setSubscription(
      providerSubscription({ customerId, cancelAtPeriodEnd: true }),
    );
    await deliver("subscription", "sub_1", customerId);

    const { body } = await user.get<BillingAccountModel>("/api/billing/me");

    expect(body).toMatchObject({
      plan: "pro",
      source: "subscription",
      subscription: {
        status: "active",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: PERIOD_END.toISOString(),
      },
      customer: { email: user.email, address: null, card: null },
    });
  });

  test("a customer is made once for a user, however many ask at once", async () => {
    const user = await createUser();
    const ids = await Promise.all([customerFor(user), customerFor(user)]);

    expect(new Set(ids).size).toBe(1);
    expect(
      await getDatabase().select().from(billingCustomersSchema),
    ).toHaveLength(1);
  });

  test("lists your invoices, payments and subscription history, and nobody else's", async () => {
    const user = await createUser();
    const other = await createUser();
    const customerId = await customerFor(user);

    memoryProvider().setInvoice(
      providerInvoice({ ...PAID_LIFETIME, customerId }),
    );
    memoryProvider().setInvoice(
      providerInvoice({ id: "in_draft", customerId, status: "draft" }),
    );
    memoryProvider().setPayment(providerPayment({ customerId }));
    memoryProvider().setSubscription(providerSubscription({ customerId }));
    await deliver("invoice", "in_1", customerId);
    await deliver("invoice", "in_draft", customerId);
    await deliver("payment", "pi_1", customerId);
    await deliver("subscription", "sub_1", customerId);

    const invoices = await user.get<Page<InvoiceModel>>(
      "/api/billing/invoices",
    );
    const payments = await user.get<Page<PaymentModel>>(
      "/api/billing/payments",
    );
    const changes = await user.get<Page<SubscriptionChangeModel>>(
      "/api/billing/subscription/changes",
    );

    expect(invoices.body).toMatchObject({
      items: [{ number: "KB-0001", status: "paid", total: 24_900 }],
      nextCursor: null,
    });
    expect(payments.body.items).toMatchObject([
      { status: "succeeded", cardLast4: "4242" },
    ]);
    expect(changes.body.items).toMatchObject([
      { kind: "created", toStatus: "active", actor: "provider" },
    ]);
    expect(
      (await other.get<Page<InvoiceModel>>("/api/billing/invoices")).body.items,
    ).toEqual([]);
  });

  test("deleting the account deletes the customer at the provider, which ends the subscription", async () => {
    const user = await createUser();
    const customerId = await customerFor(user);

    memoryProvider().setSubscription(providerSubscription({ customerId }));
    await deliver("subscription", "sub_1", customerId);

    const response = await user.delete("/api/users/me", {
      email: user.email,
      password: DEFAULT_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(await memoryProvider().findCustomer(customerId)).toBeNull();
    expect((await memoryProvider().findSubscription("sub_1"))?.status).toBe(
      "canceled",
    );
    expect(
      await getDatabase().select().from(billingCustomersSchema),
    ).toMatchObject([{ userId: null }]);
    expect(
      (await getDatabase().select().from(billingCustomersSchema))[0]?.deletedAt,
    ).toBeInstanceOf(Date);
  });
});
