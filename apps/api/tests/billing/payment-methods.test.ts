import { createUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { MEMORY_INVALID_TAX_ID } from "@/adapters/billing-provider/memory.billing-provider";
import { makeService } from "@/core/registry";
import type { BillingAccountModel } from "@/modules/billing-account";
import { BillingOffersService } from "@/modules/billing-offers";
import type { BillingTaxIdModel } from "@/modules/billing-tax-ids";
import type { CardModel } from "@/modules/payment-methods";

import { deliverWebhook, memoryProvider, seedOffers } from "./helpers";

const DETAILS = {
  name: "Ada Lovelace",
  address: {
    line1: "1 Analytical Way",
    line2: " ",
    city: "London",
    postalCode: "N1 7AA",
    country: "GB",
  },
};

const VISA = {
  id: "pm_visa",
  brand: "visa",
  last4: "4242",
  expMonth: 12,
  expYear: 2030,
};

const MASTERCARD = {
  ...VISA,
  id: "pm_mastercard",
  brand: "mastercard",
  last4: "4444",
};

const account = async (user: TestUser) =>
  (await user.get<BillingAccountModel>("/api/billing/me")).body;

const setUpCards = async (user: TestUser) => {
  const setup = await user.post<{ clientSecret: string }>(
    "/api/billing/cards/setup",
  );

  expect(setup.status).toBe(200);
  expect(setup.body.clientSecret).toStartWith("seti_memory_1_");

  memoryProvider().addCard("cus_memory_1", VISA);
  memoryProvider().addCard("cus_memory_1", MASTERCARD);
};

beforeEach(async () => {
  await seedOffers();
  await makeService(BillingOffersService).syncPrices();
});

describe("billing details", () => {
  test("sets the name and address invoices carry, empty lines left out", async () => {
    const user = await createUser();
    const response = await user.put("/api/billing/details", DETAILS);

    expect(response.status).toBe(200);
    expect((await account(user)).customer).toMatchObject({
      name: "Ada Lovelace",
      address: {
        line1: "1 Analytical Way",
        line2: null,
        city: "London",
        state: null,
        postalCode: "N1 7AA",
        country: "GB",
      },
    });
  });

  test("refuses a country that is not a two-letter code", async () => {
    const response = await (
      await createUser()
    ).put("/api/billing/details", {
      ...DETAILS,
      address: { ...DETAILS.address, country: "Britain" },
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  test("an address lets you subscribe when tax is collected", async () => {
    const user = await createUser();

    memoryProvider().collectsTax = true;
    await user.put("/api/billing/details", DETAILS);

    const response = await user.post("/api/billing/checkout/subscription", {
      offer: "pro_monthly",
    });

    expect(response.status).toBe(200);
  });
});

describe("cards", () => {
  test("a saved card is listed, and becomes the one invoices are charged to", async () => {
    const user = await createUser();

    await setUpCards(user);

    const listed = await user.get<CardModel[]>("/api/billing/cards");

    expect(listed.body).toMatchObject([
      { id: "pm_visa", isDefault: false },
      { id: "pm_mastercard", isDefault: false },
    ]);

    const made = await user.put<CardModel[]>(
      "/api/billing/cards/pm_mastercard/default",
    );

    expect(made.body).toMatchObject([
      { id: "pm_visa", isDefault: false },
      { id: "pm_mastercard", isDefault: true, last4: "4444" },
    ]);
    expect((await account(user)).customer?.card).toEqual({
      brand: "mastercard",
      last4: "4444",
    });
  });

  test("keeps the card a subscription renews on, and removes any other", async () => {
    const user = await createUser();

    await user.post("/api/billing/checkout/subscription", {
      offer: "pro_monthly",
    });

    const subscription =
      await memoryProvider().findSubscription("sub_memory_1");

    memoryProvider().setSubscription({ ...subscription!, status: "active" });
    await deliverWebhook({
      id: "evt_active",
      type: "customer.subscription.updated",
      topic: "subscription",
      objectId: "sub_memory_1",
      customerId: "cus_memory_1",
    });
    await setUpCards(user);
    await user.put("/api/billing/cards/pm_visa/default");

    const refused = await user.delete<{ code: string }>(
      "/api/billing/cards/pm_visa",
    );

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe("BILLING_CARD_IN_USE");

    const removed = await user.delete<CardModel[]>(
      "/api/billing/cards/pm_mastercard",
    );

    expect(removed.status).toBe(200);
    expect(removed.body.map((card) => card.id)).toEqual(["pm_visa"]);
  });

  test("touches no card that is not yours", async () => {
    const owner = await createUser();

    await setUpCards(owner);

    const other = await createUser();
    const response = await other.put<{ code: string }>(
      "/api/billing/cards/pm_visa/default",
    );

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("BILLING_CARD_NOT_FOUND");
    expect((await other.get<CardModel[]>("/api/billing/cards")).body).toEqual(
      [],
    );
  });
});

describe("tax ids", () => {
  test("adds a tax id to check, refuses one the provider rejects, and removes it", async () => {
    const user = await createUser();
    const added = await user.post<BillingTaxIdModel>("/api/billing/tax-ids", {
      type: "eu_vat",
      value: " DE123456789 ",
    });

    expect(added.status).toBe(200);
    expect(added.body).toMatchObject({
      type: "eu_vat",
      value: "DE123456789",
      verificationStatus: "pending",
    });

    const rejected = await user.post<{ code: string }>("/api/billing/tax-ids", {
      type: "eu_vat",
      value: MEMORY_INVALID_TAX_ID,
    });

    expect(rejected.status).toBe(422);
    expect(rejected.body.code).toBe("BILLING_DETAILS_REJECTED");

    const removed = await user.delete(`/api/billing/tax-ids/${added.body.id}`);

    expect(removed.status).toBe(200);
    expect(
      (await user.get<BillingTaxIdModel[]>("/api/billing/tax-ids")).body,
    ).toEqual([]);
    expect(
      (await user.delete(`/api/billing/tax-ids/${added.body.id}`)).status,
    ).toBe(404);
  });
});
