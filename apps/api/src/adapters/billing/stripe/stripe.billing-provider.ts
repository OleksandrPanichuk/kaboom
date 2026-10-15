import Stripe from "stripe";

import { InvalidBillingWebhookError } from "@/modules/billing/billing.errors";
import {
  BillingProvider,
  type ProviderEvent,
  type ProviderPrice,
} from "@/modules/billing/ports/billing-provider";

import {
  STRIPE_API_VERSION,
  STRIPE_LOOKUP_KEYS_PER_REQUEST,
  STRIPE_MAX_NETWORK_RETRIES,
  STRIPE_SIGNATURE_HEADER,
} from "./stripe.constants";
import { toProviderEvent, toProviderPrice } from "./stripe.helpers";

export interface StripeBillingProviderOptions {
  secretKey: string;
  webhookSecret: string;
  appName: string;
}

export class StripeBillingProvider extends BillingProvider {
  public readonly name = "stripe" as const;

  public readonly signatureHeader = STRIPE_SIGNATURE_HEADER;

  private readonly stripe: Stripe;

  private readonly webhookSecret: string;

  constructor({
    secretKey,
    webhookSecret,
    appName,
  }: StripeBillingProviderOptions) {
    super();
    this.webhookSecret = webhookSecret;
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

  public async parseWebhook(
    payload: string,
    signature: string | null,
  ): Promise<ProviderEvent> {
    if (signature === null) {
      throw new InvalidBillingWebhookError("The webhook carries no signature");
    }

    try {
      return toProviderEvent(
        await this.stripe.webhooks.constructEventAsync(
          payload,
          signature,
          this.webhookSecret,
        ),
      );
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        throw new InvalidBillingWebhookError(
          "The webhook signature does not match",
        );
      }

      throw error;
    }
  }
}
