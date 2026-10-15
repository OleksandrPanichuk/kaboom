import { beforeEach, describe, expect, test } from "bun:test";

import { makeService } from "@/core/registry";
import { disputesSchema, getDatabase, purchasesSchema } from "@/db";
import { BillingOffersService } from "@/modules/billing-offers";
import type { ProviderDispute } from "@/modules/billing-provider";

import {
  deliverWebhook,
  memoryProvider,
  PAID_LIFETIME,
  PERIOD_START,
  providerCustomer,
  providerDispute,
  providerInvoice,
  seedOffers,
} from "./helpers";

let sequence = 0;

const disputeEvent = (dispute: ProviderDispute) => {
  memoryProvider().setDispute(dispute);

  return deliverWebhook({
    id: `evt_dispute_${++sequence}`,
    type: "charge.dispute.updated",
    topic: "dispute",
    objectId: dispute.id,
  });
};

const disputes = () => getDatabase().select().from(disputesSchema);

const purchase = async () =>
  (await getDatabase().select().from(purchasesSchema))[0];

beforeEach(async () => {
  await seedOffers();
  await makeService(BillingOffersService).syncPrices();
  memoryProvider().setCustomer(providerCustomer());
  memoryProvider().setInvoice(providerInvoice(PAID_LIFETIME));
  await deliverWebhook({
    id: "evt_paid",
    type: "invoice.paid",
    topic: "invoice",
    objectId: "in_1",
    customerId: "cus_1",
  });
});

describe("disputes", () => {
  test("an open dispute is copied with its deadline and leaves the purchase alone", async () => {
    await disputeEvent(providerDispute());

    expect(await disputes()).toMatchObject([
      {
        providerDisputeId: "dp_1",
        providerAttemptId: "ch_1",
        providerPaymentId: "pi_1",
        status: "needs_response",
        reason: "fraudulent",
        evidenceDueBy: PERIOD_START,
        closedAt: null,
      },
    ]);
    expect((await purchase())?.status).toBe("paid");
  });

  test("a lost dispute ends the lifetime purchase and closes the dispute once", async () => {
    await disputeEvent(providerDispute({ status: "lost", outcome: "lost" }));

    const [closed] = await disputes();

    expect(closed?.closedAt).toBeInstanceOf(Date);
    expect(await purchase()).toMatchObject({ status: "refunded" });

    await disputeEvent(providerDispute({ status: "lost", outcome: "lost" }));

    expect((await disputes())[0]?.closedAt).toEqual(closed!.closedAt);
  });

  test("a won dispute keeps the purchase", async () => {
    await disputeEvent(providerDispute({ status: "won", outcome: "won" }));

    expect((await purchase())?.status).toBe("paid");
    expect((await disputes())[0]?.closedAt).toBeInstanceOf(Date);
  });
});
