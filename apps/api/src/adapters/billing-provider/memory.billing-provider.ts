import { createHash } from "node:crypto";

import z from "zod";

import { BILLING_EVENT_TOPICS } from "@/db";
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

  public setCustomer(customer: ProviderCustomer): void {
    this.customers.set(customer.id, customer);
  }

  public deleteCustomer(id: string): void {
    this.customers.delete(id);
  }

  public setSubscription(subscription: ProviderSubscription): void {
    this.subscriptions.set(subscription.id, subscription);
  }

  public clear(): void {
    this.prices = [...MEMORY_PRICES];
    this.customers.clear();
    this.subscriptions.clear();
    this.invoices.clear();
    this.payments.clear();
  }

  private json(payload: string): unknown {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
}
