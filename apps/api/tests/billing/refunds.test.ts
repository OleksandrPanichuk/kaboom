import { createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { makeService } from "@/core/registry";
import {
  getDatabase,
  paymentAttemptsSchema,
  purchasesSchema,
  refundsSchema,
} from "@/db";
import { BillingOffersService } from "@/modules/billing-offers";
import type { ProviderRefund } from "@/modules/billing-provider";

import {
  deliverWebhook,
  memoryProvider,
  PAID_LIFETIME,
  providerCustomer,
  providerInvoice,
  providerPayment,
  providerRefund,
  seedOffers,
} from "./helpers";

let sequence = 0;

const refundEvent = (refund: ProviderRefund, customerId: string | null) => {
  memoryProvider().setRefund(refund);

  return deliverWebhook({
    id: `evt_refund_${++sequence}`,
    type: "refund.updated",
    topic: "refund",
    objectId: refund.id,
    customerId,
  });
};

const purchase = async () =>
  (await getDatabase().select().from(purchasesSchema))[0];

beforeEach(async () => {
  await seedOffers();
  await makeService(BillingOffersService).syncPrices();

  const user = await createUser();

  memoryProvider().setCustomer(providerCustomer({ userId: user.id }));
  memoryProvider().setInvoice(providerInvoice(PAID_LIFETIME));
  memoryProvider().setPayment(providerPayment());
  await deliverWebhook({
    id: "evt_paid",
    type: "invoice.paid",
    topic: "invoice",
    objectId: "in_1",
    customerId: "cus_1",
  });
});

describe("refunds", () => {
  test("a refund made in the provider is copied, and the payment's attempt shows it", async () => {
    const refund = providerRefund({ amount: 10_000 });
    const [attempt] = providerPayment().attempts;

    memoryProvider().setPayment(
      providerPayment({
        attempts: [{ ...attempt!, amountRefunded: 10_000 }],
      }),
    );
    await refundEvent(refund, "cus_1");

    expect(await getDatabase().select().from(refundsSchema)).toMatchObject([
      {
        providerRefundId: "re_1",
        providerPaymentId: "pi_1",
        providerAttemptId: "ch_1",
        providerInvoiceId: "in_1",
        providerCreditNoteId: "cn_1",
        status: "succeeded",
        amount: 10_000,
        reason: "requested_by_customer",
      },
    ]);
    expect(
      await getDatabase().select().from(paymentAttemptsSchema),
    ).toMatchObject([{ providerAttemptId: "ch_1", amountRefunded: 10_000 }]);
    expect(await purchase()).toMatchObject({
      status: "partially_refunded",
      amountRefunded: 10_000,
    });
  });

  test("refunding the whole lifetime purchase ends it", async () => {
    await refundEvent(providerRefund({ amount: 10_000 }), "cus_1");
    await refundEvent(
      providerRefund({ id: "re_2", amount: 14_900, creditNoteId: null }),
      "cus_1",
    );

    expect(await purchase()).toMatchObject({
      status: "refunded",
      amountRefunded: 24_900,
    });
    expect((await purchase())?.refundedAt).toBeInstanceOf(Date);
  });

  test("a pending refund counts only once it has succeeded, and one that fails counts for nothing", async () => {
    await refundEvent(providerRefund({ status: "pending" }), "cus_1");

    expect(await purchase()).toMatchObject({
      status: "paid",
      amountRefunded: 0,
    });

    await refundEvent(
      providerRefund({
        status: "failed",
        failureReason: "expired_or_canceled_card",
      }),
      "cus_1",
    );

    expect(await purchase()).toMatchObject({
      status: "paid",
      amountRefunded: 0,
    });
    expect(await getDatabase().select().from(refundsSchema)).toMatchObject([
      { status: "failed", failureReason: "expired_or_canceled_card" },
    ]);
  });

  test("finds the customer of a refund whose event does not name one", async () => {
    await refundEvent(providerRefund(), null);

    const [refund] = await getDatabase().select().from(refundsSchema);

    expect(refund?.userId).not.toBeNull();
    expect((await purchase())?.status).toBe("refunded");
  });
});
