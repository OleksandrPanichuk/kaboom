import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { billingCustomersSchema, billingEventsSchema, getDatabase } from "@/db";

import { deliverWebhook, memoryProvider, providerCustomer } from "./helpers";

const customers = () => getDatabase().select().from(billingCustomersSchema);

const updated = (id: string, customerId = "cus_1") =>
  deliverWebhook({
    id,
    type: "customer.updated",
    topic: "customer",
    objectId: customerId,
    customerId,
  });

describe("syncing billing customers", () => {
  test("copies the customer as the provider has it now, not as the event said", async () => {
    const user = await createUser();

    memoryProvider().setCustomer(
      providerCustomer({
        userId: user.id,
        address: {
          line1: "1 Analytical Way",
          line2: null,
          city: "London",
          state: null,
          postalCode: "N1",
          country: "GB",
        },
        card: { paymentMethodId: "pm_1", brand: "visa", last4: "4242" },
        balance: -500,
      }),
    );

    expect((await updated("evt_1")).status).toBe(200);
    expect(await customers()).toMatchObject([
      {
        userId: user.id,
        provider: "stripe",
        providerCustomerId: "cus_1",
        email: "ada@example.test",
        addressCity: "London",
        addressCountry: "GB",
        providerPaymentMethodId: "pm_1",
        cardBrand: "visa",
        cardLast4: "4242",
        balance: -500,
        deletedAt: null,
      },
    ]);
    expect(
      await getDatabase().select().from(billingEventsSchema),
    ).toMatchObject([{ providerCustomerId: "cus_1", status: "processed" }]);
  });

  test("links no user that does not exist, and keeps a link the provider forgot", async () => {
    const user = await createUser();

    memoryProvider().setCustomer(
      providerCustomer({ userId: "6b1f1f9e-6a43-4a43-9a43-1f1f9e6a4343" }),
    );
    await updated("evt_1");

    expect((await customers())[0]?.userId).toBeNull();

    memoryProvider().setCustomer(providerCustomer({ userId: "not-a-uuid" }));
    await updated("evt_2");

    expect((await customers())[0]?.userId).toBeNull();

    memoryProvider().setCustomer(providerCustomer({ userId: user.id }));
    await updated("evt_3");
    memoryProvider().setCustomer(providerCustomer({ userId: null }));
    await updated("evt_4");

    expect((await customers())[0]?.userId).toBe(user.id);
  });

  test("links a user to one customer only", async () => {
    const user = await createUser();

    memoryProvider().setCustomer(providerCustomer({ userId: user.id }));
    memoryProvider().setCustomer(
      providerCustomer({ id: "cus_2", userId: user.id }),
    );
    await updated("evt_1");
    await updated("evt_2", "cus_2");

    const rows = (await customers()).sort((a, b) =>
      a.providerCustomerId.localeCompare(b.providerCustomerId),
    );

    expect(
      rows.map(({ providerCustomerId, userId }) => ({
        providerCustomerId,
        userId,
      })),
    ).toEqual([
      { providerCustomerId: "cus_1", userId: user.id },
      { providerCustomerId: "cus_2", userId: null },
    ]);
  });

  test("marks a customer the provider no longer has as deleted", async () => {
    memoryProvider().setCustomer(providerCustomer());
    await updated("evt_1");
    memoryProvider().deleteCustomer("cus_1");

    await deliverWebhook({
      id: "evt_2",
      type: "customer.deleted",
      topic: "customer",
      objectId: "cus_1",
      customerId: "cus_1",
    });

    expect((await customers())[0]?.deletedAt).toBeInstanceOf(Date);
  });
});
