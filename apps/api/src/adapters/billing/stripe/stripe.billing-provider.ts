import Stripe from "stripe";

import {
  BillingProvider,
  type ProviderPrice,
} from "@/modules/billing/ports/billing-provider";

import {
  STRIPE_API_VERSION,
  STRIPE_LOOKUP_KEYS_PER_REQUEST,
  STRIPE_MAX_NETWORK_RETRIES,
} from "./stripe.constants";
import { toProviderPrice } from "./stripe.helpers";

export interface StripeBillingProviderOptions {
  secretKey: string;
  appName: string;
}

export class StripeBillingProvider extends BillingProvider {
  public readonly name = "stripe" as const;

  private readonly stripe: Stripe;

  constructor({ secretKey, appName }: StripeBillingProviderOptions) {
    super();
    this.stripe = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
      appInfo: { name: appName },
    });
  }

  public async findPrices(
    lookupKeys: readonly string[],
  ): Promise<ProviderPrice[]> {
    const prices: ProviderPrice[] = [];

    for (
      let start = 0;
      start < lookupKeys.length;
      start += STRIPE_LOOKUP_KEYS_PER_REQUEST
    ) {
      const page = await this.stripe.prices.list({
        lookup_keys: lookupKeys.slice(
          start,
          start + STRIPE_LOOKUP_KEYS_PER_REQUEST,
        ),
        limit: STRIPE_LOOKUP_KEYS_PER_REQUEST,
      });

      prices.push(...page.data.map(toProviderPrice));
    }

    return prices;
  }
}
