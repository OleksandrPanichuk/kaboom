import Stripe from "stripe";

import { InvalidBillingWebhookError } from "@/modules/billing-provider/billing-provider.errors";
import {
  BillingProvider,
  type ProviderCustomer,
  type ProviderEvent,
  type ProviderPrice,
  type ProviderSubscription,
} from "@/modules/billing-provider/ports/billing-provider";

import {
  STRIPE_API_VERSION,
  STRIPE_LOOKUP_KEYS_PER_REQUEST,
  STRIPE_MAX_NETWORK_RETRIES,
  STRIPE_SIGNATURE_HEADER,
} from "./stripe.constants";
import {
  toProviderCustomer,
  toProviderEvent,
  toProviderPrice,
  toProviderSubscription,
} from "./stripe.helpers";

const missing = (error: unknown): boolean =>
  error instanceof Stripe.errors.StripeInvalidRequestError &&
  error.code === "resource_missing";

export interface StripeBillingProviderOptions {
  secretKey: string;
  webhookSecret: string;
  appName: string;
}

export class StripeBillingProvider extends BillingProvider {
  public readonly name = "stripe" as const;

  public readonly available = true;

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

  public async findCustomer(id: string): Promise<ProviderCustomer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(id, {
        expand: ["invoice_settings.default_payment_method"],
      });

      return customer.deleted ? null : toProviderCustomer(customer);
    } catch (error) {
      if (missing(error)) return null;

      throw error;
    }
  }

  public async findSubscription(
    id: string,
  ): Promise<ProviderSubscription | null> {
    try {
      return toProviderSubscription(
        await this.stripe.subscriptions.retrieve(id),
      );
    } catch (error) {
      if (missing(error)) return null;

      throw error;
    }
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
