import { createClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import {
  MEMORY_PRICES,
  type MemoryBillingProvider,
} from "@/adapters/billing/memory.billing-provider";
import { getEnv } from "@/configs";
import { make, makeService } from "@/core/registry";
import { billingPricesSchema, getDatabase } from "@/db";
import {
  BillingCatalogService,
  BillingPriceMisconfiguredError,
  type BillingPriceModel,
  BillingProvider,
  type PriceOffer,
} from "@/modules/billing";

const env = getEnv();
const OFFERS: PriceOffer[] = [
  {
    lookupKey: env.BILLING_PRICE_PRO_MONTHLY,
    planKey: "pro",
    type: "recurring",
  },
  {
    lookupKey: env.BILLING_PRICE_PRO_LIFETIME,
    planKey: "pro",
    type: "one_time",
  },
];
const [MONTHLY, LIFETIME] = MEMORY_PRICES;

const provider = () => make(BillingProvider) as MemoryBillingProvider;
const sync = () => makeService(BillingCatalogService).syncPrices(OFFERS);
const failure = () =>
  sync().then(
    () => null,
    (error: unknown) => error,
  );
const listed = async () =>
  (await createClient().get<BillingPriceModel[]>("/api/billing/prices")).body;

beforeEach(sync);

describe("the prices on offer", () => {
  test("lists monthly and lifetime Pro to anyone, cheapest first", async () => {
    const response = await createClient().get<BillingPriceModel[]>(
      "/api/billing/prices",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        lookupKey: "pro_monthly",
        planKey: "pro",
        type: "recurring",
        interval: "month",
        intervalCount: 1,
        unitAmount: MONTHLY!.unitAmount,
        currency: "usd",
        taxBehavior: "inclusive",
      },
      {
        lookupKey: "pro_lifetime",
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

  test("syncing again keeps one row per price", async () => {
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

    expect((await listed()).map((price) => price.unitAmount)).toEqual([
      1_500,
      LIFETIME!.unitAmount,
    ]);

    const [old] = await getDatabase()
      .select()
      .from(billingPricesSchema)
      .where(eq(billingPricesSchema.providerPriceId, MONTHLY!.id));

    expect(old).toMatchObject({ lookupKey: null, active: false });
  });

  test("refuses to start without a price for every offer", async () => {
    provider().setPrices([MONTHLY!]);

    expect(await failure()).toBeInstanceOf(BillingPriceMisconfiguredError);
  });

  test("refuses a lifetime price that recurs", async () => {
    provider().setPrices([
      MONTHLY!,
      { ...MONTHLY!, id: "price_memory_wrong", lookupKey: "pro_lifetime" },
    ]);

    expect(await failure()).toMatchObject({
      message:
        'The stripe price "pro_lifetime" must be one_time, not recurring',
    });
  });
});
