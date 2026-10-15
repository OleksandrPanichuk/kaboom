import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { getDatabase, invoicesSchema } from "@/db";

import {
  deliverWebhook,
  memoryProvider,
  PERIOD_START,
  providerCustomer,
  providerInvoice,
} from "./helpers";

const invoices = () => getDatabase().select().from(invoicesSchema);

let sequence = 0;

const deliver = (type: string) =>
  deliverWebhook({
    id: `evt_${++sequence}`,
    type,
    topic: "invoice",
    objectId: "in_1",
    customerId: "cus_1",
  });

describe("syncing invoices", () => {
  test("copies an invoice with its totals, address and the user it was billed to", async () => {
    const user = await createUser();

    memoryProvider().setCustomer(providerCustomer({ userId: user.id }));
    memoryProvider().setInvoice(
      providerInvoice({
        subscriptionId: "sub_1",
        tax: 400,
        total: 2_400,
        address: {
          line1: "1 Analytical Way",
          line2: null,
          city: "London",
          state: null,
          postalCode: "N1",
          country: "GB",
        },
      }),
    );

    await deliver("invoice.finalized");

    expect(await invoices()).toMatchObject([
      {
        userId: user.id,
        providerInvoiceId: "in_1",
        providerCustomerId: "cus_1",
        providerSubscriptionId: "sub_1",
        number: "KB-0001",
        status: "open",
        tax: 400,
        total: 2_400,
        addressCity: "London",
        hostedInvoiceUrl: "https://invoice.example.test/in_1",
      },
    ]);
  });

  test("takes the invoice as it is now when it is paid", async () => {
    memoryProvider().setCustomer(providerCustomer());
    memoryProvider().setInvoice(providerInvoice());
    await deliver("invoice.finalized");

    memoryProvider().setInvoice(
      providerInvoice({
        status: "paid",
        amountPaid: 24_900,
        amountRemaining: 0,
        paidAt: PERIOD_START,
      }),
    );
    await deliver("invoice.paid");

    expect(await invoices()).toMatchObject([
      { status: "paid", amountPaid: 24_900, amountRemaining: 0 },
    ]);
  });
});
