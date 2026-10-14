import type Stripe from "stripe";

import {
  PRICE_INTERVALS,
  PRICE_TYPES,
  SUBSCRIPTION_STATUSES,
  TAX_BEHAVIORS,
  TAX_EXEMPT_STATUSES,
} from "@/db";
import type {
  ProviderAddress,
  ProviderCard,
  ProviderCustomer,
  ProviderEvent,
  ProviderPrice,
  ProviderSubscription,
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

const idOf = (value: unknown): string | null => {
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

export const toProviderEvent = (event: Stripe.Event): ProviderEvent => ({
  id: event.id,
  type: event.type,
  topic: STRIPE_EVENT_TOPICS[event.type] ?? null,
  objectId: idOf(event.data.object),
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
