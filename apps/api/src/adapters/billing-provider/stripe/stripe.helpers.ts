import type Stripe from "stripe";

import {
  INVOICE_STATUSES,
  PAYMENT_ATTEMPT_STATUSES,
  PAYMENT_STATUSES,
  PRICE_INTERVALS,
  PRICE_TYPES,
  REFUND_STATUSES,
  SUBSCRIPTION_STATUSES,
  TAX_BEHAVIORS,
  TAX_EXEMPT_STATUSES,
} from "@/db";
import type {
  ProviderAddress,
  ProviderCard,
  ProviderCheckout,
  ProviderCustomer,
  ProviderDispute,
  ProviderEvent,
  ProviderInvoice,
  ProviderPayment,
  ProviderPaymentAttempt,
  ProviderPrice,
  ProviderRefund,
  ProviderStoredCard,
  ProviderSubscription,
  ProviderTaxId,
} from "@/modules/billing-provider/ports/billing-provider";

import {
  STRIPE_EVENT_TOPICS,
  STRIPE_USER_ID_METADATA_KEY,
} from "./stripe.constants";

const known = <T extends string>(
  values: readonly T[],
  value: string,
  what: string,
): T => {
  const match = values.find((candidate) => candidate === value);

  if (match === undefined) {
    throw new Error(`Stripe sent an unknown ${what}: "${value}"`);
  }

  return match;
};

export const toProviderPrice = (price: Stripe.Price): ProviderPrice => {
  if (price.unit_amount === null) {
    throw new Error(
      `The Stripe price ${price.id} has no unit amount; only flat prices are supported`,
    );
  }

  return {
    id: price.id,
    lookupKey: price.lookup_key,
    type: known(PRICE_TYPES, price.type, "price type"),
    interval: price.recurring
      ? known(PRICE_INTERVALS, price.recurring.interval, "price interval")
      : null,
    intervalCount: price.recurring?.interval_count ?? null,
    unitAmount: price.unit_amount,
    currency: price.currency,
    taxBehavior: known(
      TAX_BEHAVIORS,
      price.tax_behavior ?? "unspecified",
      "tax behaviour",
    ),
    active: price.active,
  };
};

const SECOND = 1_000;

const toDate = (seconds: number | null | undefined): Date | null =>
  seconds === null || seconds === undefined ? null : new Date(seconds * SECOND);

export const idOf = (value: unknown): string | null => {
  if (typeof value === "string") return value;

  if (typeof value === "object" && value !== null && "id" in value) {
    return typeof value.id === "string" ? value.id : null;
  }

  return null;
};

const customerOf = (event: Stripe.Event): string | null => {
  const object = event.data.object as { object?: unknown; id?: unknown };

  if (object.object === "customer") return idOf(object);

  const previous = event.data.previous_attributes as
    { customer?: unknown } | undefined;

  return (
    idOf((object as { customer?: unknown }).customer) ??
    idOf(previous?.customer)
  );
};

const topicObjectOf = (event: Stripe.Event): string | null => {
  const object = event.data.object as {
    object?: unknown;
    payment_intent?: unknown;
    invoice?: unknown;
  };

  if (object.object === "invoice_payment") return idOf(object.invoice);

  if (
    object.object === "charge" &&
    STRIPE_EVENT_TOPICS[event.type] === "payment"
  ) {
    return idOf(object.payment_intent);
  }

  return idOf(object);
};

export const toProviderEvent = (event: Stripe.Event): ProviderEvent => ({
  id: event.id,
  type: event.type,
  topic: STRIPE_EVENT_TOPICS[event.type] ?? null,
  objectId: topicObjectOf(event),
  customerId: customerOf(event),
  live: event.livemode,
  createdAt: new Date(event.created * SECOND),
  payload: event,
});

const toProviderAddress = (
  address: Stripe.Address | null | undefined,
): ProviderAddress | null =>
  address
    ? {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postal_code,
        country: address.country,
      }
    : null;

const toProviderCard = (
  method: string | Stripe.PaymentMethod | null,
): ProviderCard | null => {
  if (method === null) return null;

  if (typeof method === "string") {
    return { paymentMethodId: method, brand: null, last4: null };
  }

  return {
    paymentMethodId: method.id,
    brand: method.card?.brand ?? null,
    last4: method.card?.last4 ?? null,
  };
};

export const toProviderCustomer = (
  customer: Stripe.Customer,
): ProviderCustomer => ({
  id: customer.id,
  userId: customer.metadata[STRIPE_USER_ID_METADATA_KEY] ?? null,
  email: customer.email,
  name: customer.name ?? null,
  address: toProviderAddress(customer.address),
  card: toProviderCard(customer.invoice_settings.default_payment_method),
  taxExempt: known(
    TAX_EXEMPT_STATUSES,
    customer.tax_exempt ?? "none",
    "tax exemption",
  ),
  balance: customer.balance,
});

export const toProviderSubscription = (
  subscription: Stripe.Subscription,
): ProviderSubscription => {
  const [item, ...rest] = subscription.items.data;
  const customerId = idOf(subscription.customer);

  if (!item || rest.length > 0) {
    throw new Error(
      `The Stripe subscription ${subscription.id} has ${subscription.items.data.length} items; only one is supported`,
    );
  }

  return {
    id: subscription.id,
    customerId: customerId!,
    priceId: item.price.id,
    status: known(
      SUBSCRIPTION_STATUSES,
      subscription.status,
      "subscription status",
    ),
    quantity: item.quantity ?? 1,
    currentPeriodStart: toDate(item.current_period_start),
    currentPeriodEnd: toDate(item.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: toDate(subscription.cancel_at),
    canceledAt: toDate(subscription.canceled_at),
    cancellationReason: subscription.cancellation_details?.reason ?? null,
    endedAt: toDate(subscription.ended_at),
    trialStart: toDate(subscription.trial_start),
    trialEnd: toDate(subscription.trial_end),
    latestInvoiceId: idOf(subscription.latest_invoice),
    createdAt: new Date(subscription.created * SECOND),
  };
};

const priceOf = (line: Stripe.InvoiceLineItem): string | null =>
  idOf(line.pricing?.price_details?.price);

export const toProviderInvoice = (
  invoice: Stripe.Invoice,
  lines: readonly Stripe.InvoiceLineItem[],
): ProviderInvoice => {
  const customerId = idOf(invoice.customer);

  if (customerId === null) {
    throw new Error(`The Stripe invoice ${invoice.id} has no customer`);
  }

  return {
    id: invoice.id,
    customerId,
    subscriptionId: idOf(invoice.parent?.subscription_details?.subscription),
    number: invoice.number,
    status: known(
      INVOICE_STATUSES,
      invoice.status ?? "draft",
      "invoice status",
    ),
    billingReason: invoice.billing_reason,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    tax: (invoice.total_taxes ?? []).reduce((sum, tax) => sum + tax.amount, 0),
    total: invoice.total,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    amountRemaining: invoice.amount_remaining,
    periodStart: toDate(invoice.period_start),
    periodEnd: toDate(invoice.period_end),
    customerName: invoice.customer_name,
    address: toProviderAddress(invoice.customer_address),
    hostedUrl: invoice.hosted_invoice_url ?? null,
    pdfUrl: invoice.invoice_pdf ?? null,
    dueDate: toDate(invoice.due_date),
    finalizedAt: toDate(invoice.status_transitions.finalized_at),
    paidAt: toDate(invoice.status_transitions.paid_at),
    voidedAt: toDate(invoice.status_transitions.voided_at),
    priceIds: [
      ...new Set(
        lines.map(priceOf).filter((price): price is string => price !== null),
      ),
    ],
    paymentIds: (invoice.payments?.data ?? [])
      .filter((payment) => payment.status === "paid")
      .map((payment) => idOf(payment.payment.payment_intent))
      .filter((id): id is string => id !== null),
    createdAt: new Date(invoice.created * SECOND),
  };
};

const transactionOf = (
  transaction: string | Stripe.BalanceTransaction | null,
): Pick<ProviderPaymentAttempt, "transactionId" | "fee" | "net"> => {
  if (transaction === null) {
    return { transactionId: null, fee: null, net: null };
  }

  if (typeof transaction === "string") {
    return { transactionId: transaction, fee: null, net: null };
  }

  return {
    transactionId: transaction.id,
    fee: transaction.fee,
    net: transaction.net,
  };
};

export const toProviderPaymentAttempt = (
  charge: Stripe.Charge,
): ProviderPaymentAttempt => ({
  id: charge.id,
  status: known(PAYMENT_ATTEMPT_STATUSES, charge.status, "charge status"),
  amount: charge.amount,
  amountRefunded: charge.amount_refunded,
  currency: charge.currency,
  outcomeType: charge.outcome?.type ?? null,
  riskLevel: charge.outcome?.risk_level ?? null,
  failureCode: charge.failure_code,
  failureMessage: charge.failure_message,
  ...transactionOf(charge.balance_transaction),
  createdAt: new Date(charge.created * SECOND),
});

export const toProviderPayment = (
  intent: Stripe.PaymentIntent,
  charges: readonly Stripe.Charge[],
  invoiceId: string | null,
): ProviderPayment => {
  const latest =
    charges.find((charge) => charge.id === idOf(intent.latest_charge)) ?? null;
  const succeeded = charges.find((charge) => charge.status === "succeeded");

  return {
    id: intent.id,
    customerId: idOf(intent.customer),
    invoiceId,
    status: known(PAYMENT_STATUSES, intent.status, "payment status"),
    amount: intent.amount,
    amountReceived: intent.amount_received,
    currency: intent.currency,
    methodType: latest?.payment_method_details?.type ?? null,
    cardBrand: latest?.payment_method_details?.card?.brand ?? null,
    cardLast4: latest?.payment_method_details?.card?.last4 ?? null,
    failureCode: intent.last_payment_error?.code ?? null,
    declineCode: intent.last_payment_error?.decline_code ?? null,
    failureMessage: intent.last_payment_error?.message ?? null,
    succeededAt: succeeded ? new Date(succeeded.created * SECOND) : null,
    attempts: charges.map(toProviderPaymentAttempt),
    createdAt: new Date(intent.created * SECOND),
  };
};

export const toProviderRefund = (
  refund: Stripe.Refund,
  invoiceId: string | null,
  creditNoteId: string | null,
): ProviderRefund => ({
  id: refund.id,
  customerId: idOf(refund.customer),
  paymentId: idOf(refund.payment_intent),
  attemptId: idOf(refund.charge),
  invoiceId,
  creditNoteId,
  status: known(REFUND_STATUSES, refund.status ?? "pending", "refund status"),
  amount: refund.amount,
  currency: refund.currency,
  reason: refund.reason,
  failureReason: refund.failure_reason ?? null,
  createdAt: new Date(refund.created * SECOND),
});

const DISPUTE_OUTCOMES: Readonly<Record<string, ProviderDispute["outcome"]>> = {
  won: "won",
  lost: "lost",
};

export const toProviderDispute = (
  dispute: Stripe.Dispute,
  invoiceId: string | null,
): ProviderDispute => {
  const attemptId = idOf(dispute.charge);
  const charge = typeof dispute.charge === "string" ? null : dispute.charge;

  if (attemptId === null) {
    throw new Error(`The Stripe dispute ${dispute.id} has no charge`);
  }

  return {
    id: dispute.id,
    customerId: idOf(charge?.customer),
    paymentId: idOf(dispute.payment_intent),
    attemptId,
    invoiceId,
    status: dispute.status,
    outcome: DISPUTE_OUTCOMES[dispute.status] ?? null,
    reason: dispute.reason,
    amount: dispute.amount,
    currency: dispute.currency,
    evidenceDueBy: toDate(dispute.evidence_details.due_by),
    createdAt: new Date(dispute.created * SECOND),
  };
};

export const toProviderTaxId = (
  taxId: Stripe.TaxId,
  customerId: string,
): ProviderTaxId => ({
  id: taxId.id,
  customerId: idOf(taxId.customer) ?? customerId,
  type: taxId.type,
  value: taxId.value,
  verificationStatus: taxId.verification?.status ?? null,
});

const confirmationSecretOf = (
  invoice: string | Stripe.Invoice | null,
): string | null =>
  typeof invoice === "object" && invoice !== null
    ? (invoice.confirmation_secret?.client_secret ?? null)
    : null;

export const toSubscriptionCheckout = (
  subscription: Stripe.Subscription,
): ProviderCheckout<ProviderSubscription> => ({
  object: toProviderSubscription(subscription),
  clientSecret: confirmationSecretOf(subscription.latest_invoice),
});

export const toInvoiceCheckout = (
  invoice: Stripe.Invoice,
): ProviderCheckout<ProviderInvoice> => ({
  object: toProviderInvoice(invoice, invoice.lines.data),
  clientSecret:
    invoice.status === "open"
      ? (invoice.confirmation_secret?.client_secret ?? null)
      : null,
});

export const toProviderStoredCard = (
  method: Stripe.PaymentMethod,
): ProviderStoredCard => ({
  id: method.id,
  brand: method.card?.brand ?? null,
  last4: method.card?.last4 ?? null,
  expMonth: method.card?.exp_month ?? null,
  expYear: method.card?.exp_year ?? null,
});
