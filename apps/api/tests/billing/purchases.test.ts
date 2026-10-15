import { createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { asc, eq } from "drizzle-orm";

import { makeService } from "@/core/registry";
import {
  billingEventsSchema,
  getDatabase,
  invoicesSchema,
  purchasesSchema,
} from "@/db";
import { BillingOffersService } from "@/modules/billing-offers";
import type { ProviderInvoice } from "@/modules/billing-provider";

import {
  deliverWebhook,
  memoryProvider,
  PERIOD_START,
  providerCustomer,
  providerInvoice,
  seedOffers,
} from "./helpers";

const purchases = () =>
  getDatabase()
    .select()
    .from(purchasesSchema)
    .orderBy(asc(purchasesSchema.providerInvoiceId));

let sequence = 0;

const deliver = (invoice: ProviderInvoice) => {
  memoryProvider().setInvoice(invoice);

  return deliverWebhook({
    id: `evt_${++sequence}`,
    type: "invoice.updated",
    topic: "invoice",
    objectId: invoice.id,
    customerId: invoice.customerId,
  });
};

const PAID = {
  status: "paid" as const,
  amountPaid: 24_900,
  amountRemaining: 0,
  paidAt: PERIOD_START,
  paymentIds: ["pi_1"],
};

beforeEach(async () => {
  await seedOffers();
  await makeService(BillingOffersService).syncPrices();
  memoryProvider().setCustomer(providerCustomer());
});

describe("lifetime purchases", () => {
  test("an open invoice for the lifetime price is a pending purchase, and paying it completes it", async () => {
    const user = await createUser();

    memoryProvider().setCustomer(providerCustomer({ userId: user.id }));
    await deliver(providerInvoice());

    expect(await purchases()).toMatchObject([
      {
        userId: user.id,
        providerInvoiceId: "in_1",
        providerPriceId: "price_memory_pro_lifetime",
        status: "pending",
        amount: 24_900,
        paidAt: null,
      },
    ]);

    await deliver(providerInvoice(PAID));

    expect(await purchases()).toMatchObject([
      { status: "paid", providerPaymentId: "pi_1", paidAt: PERIOD_START },
    ]);
    expect(
      await getDatabase()
        .select()
        .from(invoicesSchema)
        .where(eq(invoicesSchema.providerInvoiceId, "in_1")),
    ).toMatchObject([{ status: "paid" }]);
  });

  test("a subscription's invoice, a draft or another price is no purchase", async () => {
    await deliver(providerInvoice({ id: "in_sub", subscriptionId: "sub_1" }));
    await deliver(providerInvoice({ id: "in_draft", status: "draft" }));
    await deliver(
      providerInvoice({
        id: "in_monthly",
        priceIds: ["price_memory_pro_monthly"],
      }),
    );

    expect(await purchases()).toEqual([]);
  });

  test("a voided invoice cancels the purchase, and an uncollectible one fails it", async () => {
    await deliver(providerInvoice());
    await deliver(providerInvoice({ status: "void", voidedAt: PERIOD_START }));
    await deliver(providerInvoice({ id: "in_2" }));
    await deliver(providerInvoice({ id: "in_2", status: "uncollectible" }));

    expect((await purchases()).map((purchase) => purchase.status)).toEqual([
      "canceled",
      "failed",
    ]);
  });

  test("a refunded purchase stays refunded when its invoice is synced again", async () => {
    await deliver(providerInvoice(PAID));
    await getDatabase()
      .update(purchasesSchema)
      .set({ status: "refunded", amountRefunded: 24_900 });

    await deliver(providerInvoice(PAID));

    expect(await purchases()).toMatchObject([
      { status: "refunded", amountRefunded: 24_900 },
    ]);
  });

  test("a new purchase settles an abandoned one first, and refuses a second live one", async () => {
    await deliver(providerInvoice());
    memoryProvider().setInvoice(providerInvoice({ status: "void" }));
    await deliver(providerInvoice({ id: "in_2" }));

    expect(
      (await purchases()).map(({ providerInvoiceId, status }) => ({
        providerInvoiceId,
        status,
      })),
    ).toEqual([
      { providerInvoiceId: "in_1", status: "canceled" },
      { providerInvoiceId: "in_2", status: "pending" },
    ]);

    await deliver(providerInvoice({ id: "in_3" }));

    const failed = await getDatabase()
      .select()
      .from(billingEventsSchema)
      .where(eq(billingEventsSchema.providerObjectId, "in_3"));

    expect(failed).toMatchObject([{ status: "failed" }]);
    expect(failed[0]?.lastError).toContain("two live lifetime purchases");
  });
});
