import { getApp } from "@tests/helpers";

import {
  MEMORY_SIGNATURE_HEADER,
  type MemoryBillingProvider,
  type MemoryWebhook,
  signMemoryWebhook,
} from "@/adapters/billing-provider/memory.billing-provider";
import { make } from "@/core/registry";
import { billingOffersSchema, getDatabase } from "@/db";
import {
  BillingProvider,
  type ProviderCustomer,
  type ProviderDispute,
  type ProviderInvoice,
  type ProviderPayment,
  type ProviderRefund,
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

export const deliverWebhook = (event: MemoryWebhook) => {
  const body = JSON.stringify(event);

  return getApp().handle(
    new Request("http://localhost:3000/api/billing/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        [MEMORY_SIGNATURE_HEADER]: signMemoryWebhook(body),
      },
      body,
    }),
  );
};

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

export const providerInvoice = (
  overrides: Partial<ProviderInvoice> = {},
): ProviderInvoice => ({
  id: "in_1",
  customerId: "cus_1",
  subscriptionId: null,
  number: "KB-0001",
  status: "open",
  billingReason: "manual",
  currency: "usd",
  subtotal: 24_900,
  tax: 0,
  total: 24_900,
  amountDue: 24_900,
  amountPaid: 0,
  amountRemaining: 24_900,
  periodStart: PERIOD_START,
  periodEnd: PERIOD_START,
  customerName: "Ada",
  address: null,
  hostedUrl: "https://invoice.example.test/in_1",
  pdfUrl: "https://invoice.example.test/in_1.pdf",
  dueDate: null,
  finalizedAt: PERIOD_START,
  paidAt: null,
  voidedAt: null,
  priceIds: ["price_memory_pro_lifetime"],
  paymentIds: [],
  createdAt: PERIOD_START,
  ...overrides,
});

export const providerPayment = (
  overrides: Partial<ProviderPayment> = {},
): ProviderPayment => ({
  id: "pi_1",
  customerId: "cus_1",
  invoiceId: "in_1",
  status: "succeeded",
  amount: 24_900,
  amountReceived: 24_900,
  currency: "usd",
  methodType: "card",
  cardBrand: "visa",
  cardLast4: "4242",
  failureCode: null,
  declineCode: null,
  failureMessage: null,
  succeededAt: PERIOD_START,
  attempts: [
    {
      id: "ch_1",
      status: "succeeded",
      amount: 24_900,
      amountRefunded: 0,
      currency: "usd",
      outcomeType: "authorized",
      riskLevel: "normal",
      failureCode: null,
      failureMessage: null,
      transactionId: "txn_1",
      fee: 752,
      net: 24_148,
      createdAt: PERIOD_START,
    },
  ],
  createdAt: PERIOD_START,
  ...overrides,
});

export const providerRefund = (
  overrides: Partial<ProviderRefund> = {},
): ProviderRefund => ({
  id: "re_1",
  customerId: "cus_1",
  paymentId: "pi_1",
  attemptId: "ch_1",
  invoiceId: "in_1",
  creditNoteId: "cn_1",
  status: "succeeded",
  amount: 24_900,
  currency: "usd",
  reason: "requested_by_customer",
  failureReason: null,
  createdAt: PERIOD_START,
  ...overrides,
});

export const providerDispute = (
  overrides: Partial<ProviderDispute> = {},
): ProviderDispute => ({
  id: "dp_1",
  customerId: "cus_1",
  paymentId: "pi_1",
  attemptId: "ch_1",
  invoiceId: "in_1",
  status: "needs_response",
  outcome: null,
  reason: "fraudulent",
  amount: 24_900,
  currency: "usd",
  evidenceDueBy: PERIOD_START,
  createdAt: PERIOD_START,
  ...overrides,
});

export const PAID_LIFETIME = {
  status: "paid" as const,
  amountPaid: 24_900,
  amountRemaining: 0,
  paidAt: PERIOD_START,
  paymentIds: ["pi_1"],
};
