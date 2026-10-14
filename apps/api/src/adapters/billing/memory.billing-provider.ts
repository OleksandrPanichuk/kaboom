import z from "zod";

import { BILLING_EVENT_TOPICS } from "@/db";
import { InvalidBillingWebhookError } from "@/modules/billing/billing.errors";
import {
  BillingProvider,
  type ProviderEvent,
  type ProviderPrice,
} from "@/modules/billing/ports/billing-provider";

export const MEMORY_SIGNATURE_HEADER = "x-memory-signature";

export const MEMORY_WEBHOOK_SIGNATURE = "memory-signed";

export const MemoryWebhookSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  topic: z.enum(BILLING_EVENT_TOPICS).nullable().default(null),
  objectId: z.string().nullable().default(null),
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
    if (signature !== MEMORY_WEBHOOK_SIGNATURE) {
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

  public clear(): void {
    this.prices = [...MEMORY_PRICES];
  }

  private json(payload: string): unknown {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
}
