import { createClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import {
  MEMORY_PRICES,
  type MemoryBillingProvider,
} from "@/adapters/billing-provider/memory.billing-provider";
import { make, makeService } from "@/core/registry";
import { billingOffersSchema, billingPricesSchema, getDatabase } from "@/db";
import {
  type BillingOfferModel,
  BillingOffersService,
  BillingPriceMisconfiguredError,
} from "@/modules/billing-offers";
import { BillingProvider } from "@/modules/billing-provider";

import { seedOffers } from "./helpers";

const [MONTHLY, LIFETIME] = MEMORY_PRICES;

const provider = () => make(BillingProvider) as MemoryBillingProvider;
const sync = () => makeService(BillingOffersService).syncPrices();
const failure = () =>
  sync().then(
    () => null,
    (error: unknown) => error,
  );
const listed = async () =>
  (await createClient().get<BillingOfferModel[]>("/api/billing/offers")).body;

beforeEach(async () => {
  await seedOffers();
  await sync();
});

describe("what is on sale", () => {
  test("lists each active offer with its price, in the offers' order", async () => {
    const response = await createClient().get<BillingOfferModel[]>(
      "/api/billing/offers",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        key: "pro_monthly",
        planKey: "pro",
        type: "recurring",
        interval: "month",
        intervalCount: 1,
        unitAmount: MONTHLY!.unitAmount,
        currency: "usd",
        taxBehavior: "inclusive",
      },
      {
        key: "pro_lifetime",
        planKey: "pro",
        type: "one_time",
        interval: null,
        intervalCount: null,
        unitAmount: LIFETIME!.unitAmount,
        currency: "usd",
        taxBehavior: "inclusive",
      },
    ]);
  });

  test("syncing again keeps one price per offer", async () => {
    await sync();

    expect(await getDatabase().select().from(billingPricesSchema)).toHaveLength(
      2,
    );
  });

  test("follows a lookup key to the new price it moved to", async () => {
    provider().setPrices([
      { ...MONTHLY!, id: "price_memory_pro_monthly_v2", unitAmount: 1_500 },
      LIFETIME!,
    ]);
    await sync();

    expect((await listed()).map((offer) => offer.unitAmount)).toEqual([
      1_500,
      LIFETIME!.unitAmount,
    ]);

    const [old] = await getDatabase()
      .select()
      .from(billingPricesSchema)
      .where(eq(billingPricesSchema.providerPriceId, MONTHLY!.id));

    expect(old).toMatchObject({ lookupKey: null, active: false });
  });

  test("leaves out an offer that is no longer active, and does not need its price", async () => {
    await getDatabase()
      .update(billingOffersSchema)
      .set({ active: false })
      .where(eq(billingOffersSchema.key, "pro_lifetime"));
    provider().setPrices([MONTHLY!]);
    await sync();

    expect((await listed()).map((offer) => offer.key)).toEqual(["pro_monthly"]);
  });

  test("sells an offer at its new place in the order", async () => {
    await getDatabase()
      .update(billingOffersSchema)
      .set({ position: 0 })
      .where(eq(billingOffersSchema.key, "pro_lifetime"));

    expect((await listed()).map((offer) => offer.key)).toEqual([
      "pro_lifetime",
      "pro_monthly",
    ]);
  });

  test("refuses to start without a price for an active offer", async () => {
    provider().setPrices([MONTHLY!]);

    expect(await failure()).toBeInstanceOf(BillingPriceMisconfiguredError);
  });

  test("refuses a price that bills differently from its offer", async () => {
    provider().setPrices([
      MONTHLY!,
      { ...MONTHLY!, id: "price_memory_wrong", lookupKey: "pro_lifetime" },
    ]);

    expect(await failure()).toMatchObject({
      message:
        'The stripe price "pro_lifetime" for pro_lifetime must be one_time, not recurring',
    });

    provider().setPrices([{ ...MONTHLY!, interval: "year" }, LIFETIME!]);

    expect(await failure()).toMatchObject({
      message:
        'The stripe price "pro_monthly" for pro_monthly must bill every 1 month, not every 1 year',
    });
  });
});
