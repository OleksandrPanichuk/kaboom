import Stripe from "stripe";

import { InvalidBillingWebhookError } from "@/modules/billing-provider/billing-provider.errors";
import {
  BillingProvider,
  type ProviderCustomer,
  type ProviderEvent,
  type ProviderInvoice,
  type ProviderPayment,
  type ProviderPrice,
  type ProviderSubscription,
} from "@/modules/billing-provider/ports/billing-provider";

import {
  STRIPE_API_VERSION,
  STRIPE_LOOKUP_KEYS_PER_REQUEST,
  STRIPE_MAX_LIST,
  STRIPE_MAX_NETWORK_RETRIES,
  STRIPE_PAGE_SIZE,
  STRIPE_SIGNATURE_HEADER,
} from "./stripe.constants";
import {
  idOf,
  toProviderCustomer,
  toProviderEvent,
  toProviderInvoice,
  toProviderPayment,
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

  public async findInvoice(id: string): Promise<ProviderInvoice | null> {
    try {
      const invoice = await this.stripe.invoices.retrieve(id, {
        expand: ["payments"],
      });
      const lines = invoice.lines.has_more
        ? await this.stripe.invoices
            .listLineItems(id, { limit: STRIPE_PAGE_SIZE })
            .autoPagingToArray({ limit: STRIPE_MAX_LIST })
        : invoice.lines.data;

      return toProviderInvoice(invoice, lines);
    } catch (error) {
      if (missing(error)) return null;

      throw error;
    }
  }

  public async findPayment(id: string): Promise<ProviderPayment | null> {
    try {
      const [intent, charges, invoicePayments] = await Promise.all([
        this.stripe.paymentIntents.retrieve(id),
        this.stripe.charges
          .list({
            payment_intent: id,
            limit: STRIPE_PAGE_SIZE,
            expand: ["data.balance_transaction"],
          })
          .autoPagingToArray({ limit: STRIPE_MAX_LIST }),
        this.stripe.invoicePayments.list({
          payment: { type: "payment_intent", payment_intent: id },
          limit: 1,
        }),
      ]);
      const invoice = invoicePayments.data[0]?.invoice;

      return toProviderPayment(
        intent,
        charges,
        invoice === undefined ? null : idOf(invoice),
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
