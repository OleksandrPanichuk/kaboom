import Stripe from "stripe";

import { InvalidBillingWebhookError } from "@/modules/billing-provider/billing-provider.errors";
import {
  BillingProvider,
  type CreateProviderCustomerData,
  type CreateProviderSubscriptionData,
  type ProviderCheckout,
  type ProviderCustomer,
  type ProviderDispute,
  type ProviderEvent,
  type ProviderInvoice,
  type ProviderPayment,
  type ProviderPrice,
  type ProviderRefund,
  type ProviderSubscription,
  type ProviderTaxId,
} from "@/modules/billing-provider/ports/billing-provider";

import {
  STRIPE_API_VERSION,
  STRIPE_EVENT_TOPICS,
  STRIPE_EVENT_TYPES_PER_REQUEST,
  STRIPE_LOOKUP_KEYS_PER_REQUEST,
  STRIPE_MAX_LIST,
  STRIPE_MAX_NETWORK_RETRIES,
  STRIPE_PAGE_SIZE,
  STRIPE_SIGNATURE_HEADER,
  STRIPE_USER_ID_METADATA_KEY,
} from "./stripe.constants";
import {
  idOf,
  toProviderCustomer,
  toProviderDispute,
  toProviderEvent,
  toProviderInvoice,
  toProviderPayment,
  toProviderPrice,
  toProviderRefund,
  toProviderSubscription,
  toProviderTaxId,
  toSubscriptionCheckout,
} from "./stripe.helpers";

const missing = (error: unknown): boolean =>
  error instanceof Stripe.errors.StripeInvalidRequestError &&
  error.code === "resource_missing";

export interface StripeBillingProviderOptions {
  secretKey: string;
  webhookSecret: string;
  appName: string;
  taxEnabled: boolean;
}

export class StripeBillingProvider extends BillingProvider {
  public readonly name = "stripe" as const;

  public readonly available = true;

  public get collectsTax(): boolean {
    return this.taxEnabled;
  }

  public readonly signatureHeader = STRIPE_SIGNATURE_HEADER;

  private readonly stripe: Stripe;

  private readonly webhookSecret: string;

  private readonly taxEnabled: boolean;

  constructor({
    secretKey,
    webhookSecret,
    appName,
    taxEnabled,
  }: StripeBillingProviderOptions) {
    super();
    this.webhookSecret = webhookSecret;
    this.taxEnabled = taxEnabled;
    this.stripe = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
      appInfo: { name: appName },
    });
  }

  public async *listEvents(since: Date): AsyncIterable<ProviderEvent> {
    const types = Object.keys(STRIPE_EVENT_TOPICS);
    const gte = Math.floor(since.getTime() / 1_000);

    for (
      let start = 0;
      start < types.length;
      start += STRIPE_EVENT_TYPES_PER_REQUEST
    ) {
      for await (const event of this.stripe.events.list({
        created: { gte },
        types: types.slice(start, start + STRIPE_EVENT_TYPES_PER_REQUEST),
        limit: STRIPE_PAGE_SIZE,
      })) {
        yield toProviderEvent(event);
      }
    }
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

  public async createCustomer({
    userId,
    email,
    name,
  }: CreateProviderCustomerData): Promise<ProviderCustomer> {
    return toProviderCustomer(
      await this.stripe.customers.create(
        {
          email,
          name,
          metadata: { [STRIPE_USER_ID_METADATA_KEY]: userId },
          expand: ["invoice_settings.default_payment_method"],
        },
        { idempotencyKey: `customer-${userId}` },
      ),
    );
  }

  public async deleteCustomer(id: string): Promise<void> {
    try {
      await this.stripe.customers.del(id);
    } catch (error) {
      if (!missing(error)) throw error;
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

  public async createSubscription({
    customerId,
    priceId,
  }: CreateProviderSubscriptionData): Promise<
    ProviderCheckout<ProviderSubscription>
  > {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      automatic_tax: { enabled: this.taxEnabled },
      expand: ["latest_invoice.confirmation_secret"],
    });

    return toSubscriptionCheckout(subscription);
  }

  public async subscriptionCheckout(
    id: string,
  ): Promise<ProviderCheckout<ProviderSubscription>> {
    return toSubscriptionCheckout(
      await this.stripe.subscriptions.retrieve(id, {
        expand: ["latest_invoice.confirmation_secret"],
      }),
    );
  }

  public async scheduleCancellation(
    id: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<ProviderSubscription> {
    return toProviderSubscription(
      await this.stripe.subscriptions.update(id, {
        cancel_at_period_end: cancelAtPeriodEnd,
      }),
    );
  }

  public async cancelSubscription(id: string): Promise<ProviderSubscription> {
    return toProviderSubscription(
      await this.stripe.subscriptions.cancel(id, {
        invoice_now: false,
        prorate: false,
      }),
    );
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
      const [intent, charges, invoiceId] = await Promise.all([
        this.stripe.paymentIntents.retrieve(id),
        this.stripe.charges
          .list({
            payment_intent: id,
            limit: STRIPE_PAGE_SIZE,
            expand: ["data.balance_transaction"],
          })
          .autoPagingToArray({ limit: STRIPE_MAX_LIST }),
        this.invoiceOfPayment(id),
      ]);

      return toProviderPayment(intent, charges, invoiceId);
    } catch (error) {
      if (missing(error)) return null;

      throw error;
    }
  }

  public async findRefund(id: string): Promise<ProviderRefund | null> {
    try {
      const refund = await this.stripe.refunds.retrieve(id);
      const paymentId = idOf(refund.payment_intent);
      const invoiceId =
        paymentId === null ? null : await this.invoiceOfPayment(paymentId);
      const creditNoteId =
        invoiceId === null ? null : await this.creditNoteOf(invoiceId, id);

      return toProviderRefund(refund, invoiceId, creditNoteId);
    } catch (error) {
      if (missing(error)) return null;

      throw error;
    }
  }

  public async findDispute(id: string): Promise<ProviderDispute | null> {
    try {
      const dispute = await this.stripe.disputes.retrieve(id, {
        expand: ["charge"],
      });
      const paymentId = idOf(dispute.payment_intent);

      return toProviderDispute(
        dispute,
        paymentId === null ? null : await this.invoiceOfPayment(paymentId),
      );
    } catch (error) {
      if (missing(error)) return null;

      throw error;
    }
  }

  public async findTaxId(
    customerId: string,
    id: string,
  ): Promise<ProviderTaxId | null> {
    try {
      return toProviderTaxId(
        await this.stripe.customers.retrieveTaxId(customerId, id),
        customerId,
      );
    } catch (error) {
      if (missing(error)) return null;

      throw error;
    }
  }

  private async invoiceOfPayment(paymentId: string): Promise<string | null> {
    const page = await this.stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentId },
      limit: 1,
    });
    const invoice = page.data[0]?.invoice;

    return invoice === undefined ? null : idOf(invoice);
  }

  private async creditNoteOf(
    invoiceId: string,
    refundId: string,
  ): Promise<string | null> {
    const notes = await this.stripe.creditNotes
      .list({ invoice: invoiceId, limit: STRIPE_PAGE_SIZE })
      .autoPagingToArray({ limit: STRIPE_MAX_LIST });
    const note = notes.find((candidate) =>
      candidate.refunds.some((refund) => idOf(refund.refund) === refundId),
    );

    return note?.id ?? null;
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
