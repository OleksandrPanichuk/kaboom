import { getApp } from "@tests/helpers";

import {
  MEMORY_SIGNATURE_HEADER,
  MEMORY_WEBHOOK_SIGNATURE,
  type MemoryBillingProvider,
  type MemoryWebhook,
} from "@/adapters/billing-provider/memory.billing-provider";
import { make } from "@/core/registry";
import { billingOffersSchema, getDatabase } from "@/db";
import {
  BillingProvider,
  type ProviderCustomer,
  type ProviderSubscription,
} from "@/modules/billing-provider";

export const OFFERS = [
  {
    key: "pro_monthly",
    planKey: "pro" as const,
    type: "recurring" as const,
    interval: "month" as const,
    intervalCount: 1,
    lookupKey: "pro_monthly",
    position: 1,
  },
  {
    key: "pro_lifetime",
    planKey: "pro" as const,
    type: "one_time" as const,
    interval: null,
    intervalCount: null,
    lookupKey: "pro_lifetime",
    position: 2,
  },
];

export const seedOffers = () =>
  getDatabase().insert(billingOffersSchema).values(OFFERS).returning();

export const memoryProvider = () =>
  make(BillingProvider) as MemoryBillingProvider;

export const deliverWebhook = (event: MemoryWebhook) =>
  getApp().handle(
    new Request("http://localhost:3000/api/billing/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        [MEMORY_SIGNATURE_HEADER]: MEMORY_WEBHOOK_SIGNATURE,
      },
      body: JSON.stringify(event),
    }),
  );

export const providerCustomer = (
  overrides: Partial<ProviderCustomer> = {},
): ProviderCustomer => ({
  id: "cus_1",
  userId: null,
  email: "ada@example.test",
  name: "Ada",
  address: null,
  card: null,
  taxExempt: "none",
  balance: 0,
  ...overrides,
});

export const PERIOD_START = new Date("2026-06-01T00:00:00Z");
export const PERIOD_END = new Date("2026-07-01T00:00:00Z");

export const providerSubscription = (
  overrides: Partial<ProviderSubscription> = {},
): ProviderSubscription => ({
  id: "sub_1",
  customerId: "cus_1",
  priceId: "price_memory_pro_monthly",
  status: "active",
  quantity: 1,
  currentPeriodStart: PERIOD_START,
  currentPeriodEnd: PERIOD_END,
  cancelAtPeriodEnd: false,
  cancelAt: null,
  canceledAt: null,
  cancellationReason: null,
  endedAt: null,
  trialStart: null,
  trialEnd: null,
  latestInvoiceId: null,
  createdAt: PERIOD_START,
  ...overrides,
});
