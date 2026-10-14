import { make, makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import type { PriceOffer } from "./billing.constants";
import { BillingPriceMisconfiguredError } from "./billing.errors";
import { BillingPricesRepository, BillingProvider } from "./ports";

export class BillingCatalogService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly prices = makeRepository(BillingPricesRepository);

  public async syncPrices(offers: readonly PriceOffer[]): Promise<void> {
    const found = await this.provider.findPrices(
      offers.map((offer) => offer.lookupKey),
    );
    const synced = offers.map((offer) => {
      const price = found.find(
        (candidate) =>
          candidate.lookupKey === offer.lookupKey && candidate.active,
      );

      if (!price) {
        throw new BillingPriceMisconfiguredError(
          `No active ${this.provider.name} price has the lookup key "${offer.lookupKey}"`,
        );
      }

      if (price.type !== offer.type) {
        throw new BillingPriceMisconfiguredError(
          `The ${this.provider.name} price "${offer.lookupKey}" must be ${offer.type}, not ${price.type}`,
        );
      }

      return {
        ...price,
        provider: this.provider.name,
        lookupKey: offer.lookupKey,
        planKey: offer.planKey,
      };
    });

    await this.prices.sync(synced, new Date());
  }
}
