import {
  BillingProvider,
  type ProviderPrice,
} from "@/modules/billing/ports/billing-provider";

export const MEMORY_PRICES: readonly ProviderPrice[] = [
  {
    id: "price_memory_pro_monthly",
    lookupKey: "pro_monthly",
    type: "recurring",
    interval: "month",
    intervalCount: 1,
    unitAmount: 1_200,
    currency: "usd",
    taxBehavior: "inclusive",
    active: true,
  },
  {
    id: "price_memory_pro_lifetime",
    lookupKey: "pro_lifetime",
    type: "one_time",
    interval: null,
    intervalCount: null,
    unitAmount: 24_900,
    currency: "usd",
    taxBehavior: "inclusive",
    active: true,
  },
];

export class MemoryBillingProvider extends BillingProvider {
  private prices: ProviderPrice[] = [...MEMORY_PRICES];

  public findPrices(lookupKeys: readonly string[]): Promise<ProviderPrice[]> {
    return Promise.resolve(
      this.prices.filter(
        (price) =>
          price.lookupKey !== null && lookupKeys.includes(price.lookupKey),
      ),
    );
  }

  public setPrices(prices: readonly ProviderPrice[]): void {
    this.prices = [...prices];
  }

  public clear(): void {
    this.prices = [...MEMORY_PRICES];
  }
}
