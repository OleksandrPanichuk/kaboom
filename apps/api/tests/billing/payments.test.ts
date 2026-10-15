import { describe, expect, test } from "bun:test";
import { asc } from "drizzle-orm";

import { getDatabase, paymentAttemptsSchema, paymentsSchema } from "@/db";

import {
  deliverWebhook,
  memoryProvider,
  PERIOD_START,
  providerCustomer,
  providerPayment,
} from "./helpers";

const payments = () => getDatabase().select().from(paymentsSchema);

const attempts = () =>
  getDatabase()
    .select()
    .from(paymentAttemptsSchema)
    .orderBy(asc(paymentAttemptsSchema.providerAttemptId));

const FAILED_ATTEMPT = {
  id: "ch_0",
  status: "failed" as const,
  amount: 24_900,
  amountRefunded: 0,
  currency: "usd",
  outcomeType: "issuer_declined",
  riskLevel: "normal",
  failureCode: "card_declined",
  failureMessage: "Your card was declined.",
  transactionId: null,
  fee: null,
  net: null,
  createdAt: PERIOD_START,
};

describe("syncing payments", () => {
  test("copies a payment with every attempt, its fee and the invoice it paid", async () => {
    memoryProvider().setCustomer(providerCustomer());
    memoryProvider().setPayment(
      providerPayment({
        attempts: [FAILED_ATTEMPT, ...providerPayment().attempts],
      }),
    );

    await deliverWebhook({
      id: "evt_1",
      type: "payment_intent.succeeded",
      topic: "payment",
      objectId: "pi_1",
      customerId: "cus_1",
    });

    expect(await payments()).toMatchObject([
      {
        providerPaymentId: "pi_1",
        providerInvoiceId: "in_1",
        status: "succeeded",
        amountReceived: 24_900,
        cardBrand: "visa",
        cardLast4: "4242",
      },
    ]);
    expect(await attempts()).toMatchObject([
      {
        providerAttemptId: "ch_0",
        providerPaymentId: "pi_1",
        status: "failed",
        failureCode: "card_declined",
        fee: null,
      },
      {
        providerAttemptId: "ch_1",
        status: "succeeded",
        providerTransactionId: "txn_1",
        fee: 752,
        net: 24_148,
      },
    ]);
  });

  test("a failed payment keeps why it failed, and a later success replaces it", async () => {
    memoryProvider().setCustomer(providerCustomer());
    memoryProvider().setPayment(
      providerPayment({
        status: "requires_payment_method",
        amountReceived: 0,
        failureCode: "card_declined",
        declineCode: "insufficient_funds",
        failureMessage: "Your card has insufficient funds.",
        succeededAt: null,
        attempts: [FAILED_ATTEMPT],
      }),
    );

    const deliver = (id: string, type: string) =>
      deliverWebhook({
        id,
        type,
        topic: "payment",
        objectId: "pi_1",
        customerId: "cus_1",
      });

    await deliver("evt_1", "payment_intent.payment_failed");

    expect((await payments())[0]).toMatchObject({
      status: "requires_payment_method",
      declineCode: "insufficient_funds",
    });

    memoryProvider().setPayment(
      providerPayment({
        attempts: [FAILED_ATTEMPT, ...providerPayment().attempts],
      }),
    );
    await deliver("evt_2", "payment_intent.succeeded");

    expect((await payments())[0]).toMatchObject({
      status: "succeeded",
      failureCode: null,
    });
    expect(await attempts()).toHaveLength(2);
  });
});
