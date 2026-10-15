import { createHash } from "node:crypto";

import z from "zod";

import { BILLING_EVENT_TOPICS } from "@/db";
import {
  BillingDetailsRejectedError,
  InvalidBillingWebhookError,
} from "@/modules/billing-provider/billing-provider.errors";
import {
  BillingProvider,
  type CreateProviderCustomerData,
  type CreateProviderInvoiceData,
  type CreateProviderSubscriptionData,
  type CreateProviderTaxIdData,
  type ProviderCheckout,
  type ProviderCustomer,
  type ProviderDispute,
  type ProviderEvent,
  type ProviderInvoice,
  type ProviderPayment,
  type ProviderPrice,
  type ProviderRefund,
  type ProviderStoredCard,
  type ProviderSubscription,
  type ProviderTaxId,
  type UpdateProviderCustomerData,
} from "@/modules/billing-provider/ports/billing-provider";

export const MEMORY_INVALID_TAX_ID = "INVALID";

export const MEMORY_PERIOD_MS = 30 * 24 * 60 * 60 * 1_000;

export const MEMORY_SIGNATURE_HEADER = "x-memory-signature";

export const signMemoryWebhook = (payload: string): string =>
  createHash("sha256").update(payload).digest("hex");

export const MemoryWebhookSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  topic: z.enum(BILLING_EVENT_TOPICS).nullable().default(null),
  objectId: z.string().nullable().default(null),
  customerId: z.string().nullable().default(null),
  live: z.boolean().default(false),
  createdAt: z.iso.datetime().default(() => new Date().toISOString()),
});

export type MemoryWebhook = z.input<typeof MemoryWebhookSchema>;

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
  public readonly name = "stripe" as const;

  public readonly available = true;

  public collectsTax = false;

  public readonly signatureHeader = MEMORY_SIGNATURE_HEADER;

  public parseWebhook(
    payload: string,
    signature: string | null,
  ): Promise<ProviderEvent> {
    try {
      return Promise.resolve(this.read(payload, signature));
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private read(payload: string, signature: string | null): ProviderEvent {
    if (signature !== signMemoryWebhook(payload)) {
      throw new InvalidBillingWebhookError(
        "The webhook signature does not match",
      );
    }

    const parsed = MemoryWebhookSchema.safeParse(this.json(payload));

    if (!parsed.success) {
      throw new InvalidBillingWebhookError("The webhook is not an event");
    }

    const { createdAt, ...event } = parsed.data;

    return { ...event, createdAt: new Date(createdAt), payload: parsed.data };
  }

  private prices: ProviderPrice[] = [...MEMORY_PRICES];

  private events: ProviderEvent[] = [];

  public async *listEvents(since: Date): AsyncIterable<ProviderEvent> {
    yield* await Promise.resolve(
      this.events.filter((event) => event.createdAt >= since),
    );
  }

  public setEvents(events: readonly ProviderEvent[]): void {
    this.events = [...events];
  }

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

  private readonly customers = new Map<string, ProviderCustomer>();

  private readonly subscriptions = new Map<string, ProviderSubscription>();

  public findCustomer(id: string): Promise<ProviderCustomer | null> {
    return Promise.resolve(this.customers.get(id) ?? null);
  }

  public findSubscription(id: string): Promise<ProviderSubscription | null> {
    return Promise.resolve(this.subscriptions.get(id) ?? null);
  }

  private readonly invoices = new Map<string, ProviderInvoice>();

  private readonly payments = new Map<string, ProviderPayment>();

  public findInvoice(id: string): Promise<ProviderInvoice | null> {
    return Promise.resolve(this.invoices.get(id) ?? null);
  }

  public findPayment(id: string): Promise<ProviderPayment | null> {
    return Promise.resolve(this.payments.get(id) ?? null);
  }

  public setInvoice(invoice: ProviderInvoice): void {
    this.invoices.set(invoice.id, invoice);
  }

  public setPayment(payment: ProviderPayment): void {
    this.payments.set(payment.id, payment);
  }

  private readonly refunds = new Map<string, ProviderRefund>();

  private readonly disputes = new Map<string, ProviderDispute>();

  private readonly taxIds = new Map<string, ProviderTaxId>();

  public findRefund(id: string): Promise<ProviderRefund | null> {
    return Promise.resolve(this.refunds.get(id) ?? null);
  }

  public findDispute(id: string): Promise<ProviderDispute | null> {
    return Promise.resolve(this.disputes.get(id) ?? null);
  }

  public findTaxId(
    customerId: string,
    id: string,
  ): Promise<ProviderTaxId | null> {
    const taxId = this.taxIds.get(id);

    return Promise.resolve(taxId?.customerId === customerId ? taxId : null);
  }

  public setRefund(refund: ProviderRefund): void {
    this.refunds.set(refund.id, refund);
  }

  public setDispute(dispute: ProviderDispute): void {
    this.disputes.set(dispute.id, dispute);
  }

  public setTaxId(taxId: ProviderTaxId): void {
    this.taxIds.set(taxId.id, taxId);
  }

  public forgetTaxId(id: string): void {
    this.taxIds.delete(id);
  }

  private created = 0;

  public createCustomer({
    userId,
    email,
    name,
  }: CreateProviderCustomerData): Promise<ProviderCustomer> {
    const customer: ProviderCustomer = {
      id: `cus_memory_${++this.created}`,
      userId,
      email,
      name,
      address: null,
      card: null,
      taxExempt: "none",
      balance: 0,
    };

    this.customers.set(customer.id, customer);

    return Promise.resolve(customer);
  }

  public deleteCustomer(id: string): Promise<void> {
    this.customers.delete(id);

    for (const subscription of this.subscriptions.values()) {
      if (
        subscription.customerId === id &&
        subscription.status !== "canceled"
      ) {
        this.subscriptions.set(subscription.id, {
          ...subscription,
          status: "canceled",
          endedAt: new Date(),
        });
      }
    }

    return Promise.resolve();
  }

  private readonly cards = new Map<string, ProviderStoredCard[]>();

  private createdSetups = 0;

  private createdTaxIds = 0;

  public updateCustomer(
    id: string,
    { name, address }: UpdateProviderCustomerData,
  ): Promise<ProviderCustomer> {
    return this.changeCustomer(id, (customer) => ({
      ...customer,
      name,
      address,
    }));
  }

  public createCardSetup(customerId: string): Promise<string> {
    return Promise.resolve(
      `seti_memory_${++this.createdSetups}_${customerId}_secret`,
    );
  }

  public listCards(customerId: string): Promise<ProviderStoredCard[]> {
    return Promise.resolve([...(this.cards.get(customerId) ?? [])]);
  }

  public addCard(customerId: string, card: ProviderStoredCard): void {
    this.cards.set(customerId, [...(this.cards.get(customerId) ?? []), card]);
  }

  public setDefaultCard(
    customerId: string,
    cardId: string,
  ): Promise<ProviderCustomer> {
    const card = this.cards.get(customerId)?.find(({ id }) => id === cardId);

    if (!card) {
      return Promise.reject(
        new BillingDetailsRejectedError(`No such payment method: ${cardId}`),
      );
    }

    return this.changeCustomer(customerId, (customer) => ({
      ...customer,
      card: { paymentMethodId: card.id, brand: card.brand, last4: card.last4 },
    }));
  }

  public removeCard(cardId: string): Promise<void> {
    for (const [customerId, cards] of this.cards) {
      this.cards.set(
        customerId,
        cards.filter(({ id }) => id !== cardId),
      );

      const customer = this.customers.get(customerId);

      if (customer?.card?.paymentMethodId === cardId) {
        this.customers.set(customerId, { ...customer, card: null });
      }
    }

    return Promise.resolve();
  }

  public createTaxId(
    customerId: string,
    { type, value }: CreateProviderTaxIdData,
  ): Promise<ProviderTaxId> {
    if (value === MEMORY_INVALID_TAX_ID) {
      return Promise.reject(
        new BillingDetailsRejectedError(`Invalid value for ${type}.`),
      );
    }

    const taxId: ProviderTaxId = {
      id: `txi_memory_${++this.createdTaxIds}`,
      customerId,
      type,
      value,
      verificationStatus: "pending",
    };

    this.taxIds.set(taxId.id, taxId);

    return Promise.resolve(taxId);
  }

  public deleteTaxId(customerId: string, id: string): Promise<void> {
    if (this.taxIds.get(id)?.customerId === customerId) this.taxIds.delete(id);

    return Promise.resolve();
  }

  private changeCustomer(
    id: string,
    change: (customer: ProviderCustomer) => ProviderCustomer,
  ): Promise<ProviderCustomer> {
    const customer = this.customers.get(id);

    if (!customer) return Promise.reject(new Error(`No customer ${id}`));

    const changed = change(customer);

    this.customers.set(id, changed);

    return Promise.resolve(changed);
  }

  private createdInvoices = 0;

  public createInvoice({
    customerId,
    priceId,
  }: CreateProviderInvoiceData): Promise<ProviderCheckout<ProviderInvoice>> {
    const now = new Date();
    const price = this.prices.find((candidate) => candidate.id === priceId);
    const amount = price?.unitAmount ?? 0;
    const invoice: ProviderInvoice = {
      id: `in_memory_${++this.createdInvoices}`,
      customerId,
      subscriptionId: null,
      number: `MEM-${this.createdInvoices}`,
      status: "open",
      billingReason: "manual",
      currency: price?.currency ?? "usd",
      subtotal: amount,
      tax: 0,
      total: amount,
      amountDue: amount,
      amountPaid: 0,
      amountRemaining: amount,
      periodStart: now,
      periodEnd: now,
      customerName: null,
      address: null,
      hostedUrl: null,
      pdfUrl: null,
      dueDate: null,
      finalizedAt: now,
      paidAt: null,
      voidedAt: null,
      priceIds: [priceId],
      paymentIds: [],
      createdAt: now,
    };

    this.invoices.set(invoice.id, invoice);

    return this.invoiceCheckout(invoice.id);
  }

  public invoiceCheckout(
    id: string,
  ): Promise<ProviderCheckout<ProviderInvoice>> {
    const invoice = this.invoices.get(id);

    if (!invoice) return Promise.reject(new Error(`No invoice ${id}`));

    return Promise.resolve({
      object: invoice,
      clientSecret: invoice.status === "open" ? `${id}_secret_memory` : null,
    });
  }

  public voidInvoice(id: string): Promise<ProviderInvoice> {
    const invoice = this.invoices.get(id);

    if (!invoice) return Promise.reject(new Error(`No invoice ${id}`));

    const voided: ProviderInvoice = {
      ...invoice,
      status: "void",
      voidedAt: new Date(),
    };

    this.invoices.set(id, voided);

    return Promise.resolve(voided);
  }

  private createdSubscriptions = 0;

  public createSubscription({
    customerId,
    priceId,
  }: CreateProviderSubscriptionData): Promise<
    ProviderCheckout<ProviderSubscription>
  > {
    const now = new Date();
    const id = `sub_memory_${++this.createdSubscriptions}`;
    const subscription: ProviderSubscription = {
      id,
      customerId,
      priceId,
      status: "incomplete",
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + MEMORY_PERIOD_MS),
      cancelAtPeriodEnd: false,
      cancelAt: null,
      canceledAt: null,
      cancellationReason: null,
      endedAt: null,
      trialStart: null,
      trialEnd: null,
      latestInvoiceId: null,
      createdAt: now,
    };

    this.subscriptions.set(id, subscription);

    return this.subscriptionCheckout(id);
  }

  public subscriptionCheckout(
    id: string,
  ): Promise<ProviderCheckout<ProviderSubscription>> {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      return Promise.reject(new Error(`No subscription ${id}`));
    }

    return Promise.resolve({
      object: subscription,
      clientSecret:
        subscription.status === "incomplete" ? `${id}_secret_memory` : null,
    });
  }

  public scheduleCancellation(
    id: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<ProviderSubscription> {
    return this.changeSubscription(id, (subscription) => ({
      ...subscription,
      cancelAtPeriodEnd,
      canceledAt: cancelAtPeriodEnd ? new Date() : null,
    }));
  }

  public cancelSubscription(id: string): Promise<ProviderSubscription> {
    return this.changeSubscription(id, (subscription) => ({
      ...subscription,
      status:
        subscription.status === "incomplete"
          ? "incomplete_expired"
          : "canceled",
      canceledAt: new Date(),
      endedAt: new Date(),
    }));
  }

  private changeSubscription(
    id: string,
    change: (subscription: ProviderSubscription) => ProviderSubscription,
  ): Promise<ProviderSubscription> {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      return Promise.reject(new Error(`No subscription ${id}`));
    }

    const changed = change(subscription);

    this.subscriptions.set(id, changed);

    return Promise.resolve(changed);
  }

  public setCustomer(customer: ProviderCustomer): void {
    this.customers.set(customer.id, customer);
  }

  public forgetCustomer(id: string): void {
    this.customers.delete(id);
  }

  public setSubscription(subscription: ProviderSubscription): void {
    this.subscriptions.set(subscription.id, subscription);
  }

  public clear(): void {
    this.created = 0;
    this.createdSubscriptions = 0;
    this.createdInvoices = 0;
    this.createdSetups = 0;
    this.createdTaxIds = 0;
    this.cards.clear();
    this.collectsTax = false;
    this.prices = [...MEMORY_PRICES];
    this.events = [];
    this.customers.clear();
    this.subscriptions.clear();
    this.invoices.clear();
    this.payments.clear();
    this.refunds.clear();
    this.disputes.clear();
    this.taxIds.clear();
  }

  private json(payload: string): unknown {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
}
