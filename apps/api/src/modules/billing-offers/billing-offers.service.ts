import { make, makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import {
  BillingProvider,
  type ProviderPrice,
} from "@/modules/billing-provider";

import type { BillingOfferEntity, OfferedPrice } from "./billing-offer.entity";
import {
  BillingOfferNotFoundError,
  BillingPriceMisconfiguredError,
} from "./billing-offers.errors";
import type { BillingPriceEntity } from "./billing-price.entity";
import { BillingOffersRepository, BillingPricesRepository } from "./ports";

export class BillingOffersService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly offers = makeRepository(BillingOffersRepository);

  private readonly prices = makeRepository(BillingPricesRepository);

  public async syncPrices(): Promise<void> {
    const offers = await this.offers.listActive();

    if (offers.length === 0) return;

    const found = await this.provider.findPrices(
      offers.map((offer) => offer.lookupKey),
    );
    const synced = offers.map((offer) => ({
      ...this.priceFor(offer, found),
      provider: this.provider.name,
      offerId: offer.id,
    }));

    await this.prices.sync(synced, new Date());
  }

  public async findOffered(key: string): Promise<OfferedPrice> {
    const offered = await this.offers.findOffered(this.provider.name, key);

    if (!offered) {
      throw new BillingOfferNotFoundError(`Nothing is on sale as "${key}"`);
    }

    return offered;
  }

  public findPrice(
    providerPriceId: string,
  ): Promise<BillingPriceEntity | null> {
    return this.prices.findByProviderId(this.provider.name, providerPriceId);
  }

  private priceFor(
    offer: BillingOfferEntity,
    found: readonly ProviderPrice[],
  ): ProviderPrice {
    const price = found.find(
      (candidate) =>
        candidate.lookupKey === offer.lookupKey && candidate.active,
    );
    const name = `The ${this.provider.name} price "${offer.lookupKey}" for ${offer.key}`;

    if (!price) {
      throw new BillingPriceMisconfiguredError(
        `No active ${this.provider.name} price has the lookup key "${offer.lookupKey}", which ${offer.key} sells at`,
      );
    }

    if (price.type !== offer.type) {
      throw new BillingPriceMisconfiguredError(
        `${name} must be ${offer.type}, not ${price.type}`,
      );
    }

    if (
      price.interval !== offer.interval ||
      price.intervalCount !== offer.intervalCount
    ) {
      throw new BillingPriceMisconfiguredError(
        `${name} must bill every ${offer.intervalCount ?? "-"} ${offer.interval ?? "-"}, not every ${price.intervalCount ?? "-"} ${price.interval ?? "-"}`,
      );
    }

    return price;
  }
}
