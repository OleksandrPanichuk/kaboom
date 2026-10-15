import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";

import {
  toProviderCustomer,
  toProviderEvent,
  toProviderInvoice,
  toProviderPayment,
  toProviderPrice,
  toProviderSubscription,
} from "./stripe.helpers";

const price = (overrides: Partial<Stripe.Price>): Stripe.Price =>
  ({
    id: "price_1",
    object: "price",
    active: true,
    currency: "eur",
    lookup_key: "pro_monthly",
    recurring: {
      interval: "month",
      interval_count: 1,
      meter: null,
      trial_period_days: null,
      usage_type: "licensed",
    },
    tax_behavior: "inclusive",
    type: "recurring",
    unit_amount: 999,
    ...overrides,
  }) as Stripe.Price;

describe("reading a Stripe price", () => {
  test("keeps what a subscription is billed by", () => {
    expect(toProviderPrice(price({}))).toEqual({
      id: "price_1",
      lookupKey: "pro_monthly",
      type: "recurring",
      interval: "month",
      intervalCount: 1,
      unitAmount: 999,
      currency: "eur",
      taxBehavior: "inclusive",
      active: true,
    });
  });

  test("reads a one-time price without an interval, and an unset tax behaviour", () => {
    expect(
      toProviderPrice(
        price({ type: "one_time", recurring: null, tax_behavior: null }),
      ),
    ).toMatchObject({
      type: "one_time",
      interval: null,
      intervalCount: null,
      taxBehavior: "unspecified",
    });
  });

  test("refuses a price with no flat amount", () => {
    expect(() => toProviderPrice(price({ unit_amount: null }))).toThrow(
      "only flat prices are supported",
    );
  });
});

const event = (
  type: string,
  object: Record<string, unknown>,
  previous?: Record<string, unknown>,
): Stripe.Event =>
  ({
    id: "evt_1",
    object: "event",
    type,
    livemode: false,
    created: 1_780_000_000,
    data: { object, previous_attributes: previous },
  }) as unknown as Stripe.Event;

describe("reading a Stripe event", () => {
  test("finds the customer an event is about", () => {
    expect(
      toProviderEvent(
        event("customer.updated", { id: "cus_1", object: "customer" }),
      ),
    ).toMatchObject({
      topic: "customer",
      objectId: "cus_1",
      customerId: "cus_1",
      createdAt: new Date(1_780_000_000_000),
    });
    expect(
      toProviderEvent(
        event("customer.subscription.updated", {
          id: "sub_1",
          object: "subscription",
          customer: "cus_2",
        }),
      ),
    ).toMatchObject({
      topic: "subscription",
      objectId: "sub_1",
      customerId: "cus_2",
    });
  });

  test("finds the customer a card was detached from", () => {
    expect(
      toProviderEvent(
        event(
          "payment_method.detached",
          { id: "pm_1", object: "payment_method", customer: null },
          { customer: "cus_3" },
        ),
      ).customerId,
    ).toBe("cus_3");
  });

  test("leaves the customer out of an event about nobody", () => {
    expect(
      toProviderEvent(
        event("price.updated", { id: "price_1", object: "price" }),
      ).customerId,
    ).toBeNull();
  });
});

describe("reading a Stripe customer", () => {
  const customer = (overrides: Partial<Stripe.Customer>): Stripe.Customer =>
    ({
      id: "cus_1",
      object: "customer",
      email: "ada@example.test",
      name: "Ada",
      address: {
        line1: "1 Analytical Way",
        line2: null,
        city: "London",
        state: null,
        postal_code: "N1",
        country: "GB",
      },
      balance: -500,
      tax_exempt: "none",
      metadata: { user_id: "8b0c8a8e-1c3e-4f4b-9a54-0f4a5b0b5d11" },
      invoice_settings: {
        custom_fields: null,
        default_payment_method: {
          id: "pm_1",
          card: { brand: "visa", last4: "4242" },
        },
        footer: null,
        rendering_options: null,
      },
      ...overrides,
    }) as Stripe.Customer;

  test("keeps the address, the default card and the user it belongs to", () => {
    expect(toProviderCustomer(customer({}))).toEqual({
      id: "cus_1",
      userId: "8b0c8a8e-1c3e-4f4b-9a54-0f4a5b0b5d11",
      email: "ada@example.test",
      name: "Ada",
      address: {
        line1: "1 Analytical Way",
        line2: null,
        city: "London",
        state: null,
        postalCode: "N1",
        country: "GB",
      },
      card: { paymentMethodId: "pm_1", brand: "visa", last4: "4242" },
      taxExempt: "none",
      balance: -500,
    });
  });

  test("reads a customer with no address, card or user", () => {
    expect(
      toProviderCustomer(
        customer({
          address: null,
          metadata: {},
          tax_exempt: null,
          invoice_settings: {
            custom_fields: null,
            default_payment_method: null,
            footer: null,
            rendering_options: null,
          },
        }),
      ),
    ).toMatchObject({
      userId: null,
      address: null,
      card: null,
      taxExempt: "none",
    });
  });
});

describe("reading a Stripe subscription", () => {
  const subscription = (
    overrides: Partial<Stripe.Subscription>,
  ): Stripe.Subscription =>
    ({
      id: "sub_1",
      object: "subscription",
      customer: "cus_1",
      status: "active",
      cancel_at: null,
      cancel_at_period_end: true,
      canceled_at: 1_780_000_100,
      cancellation_details: {
        comment: null,
        feedback: null,
        reason: "cancellation_requested",
      },
      created: 1_780_000_000,
      ended_at: null,
      trial_start: null,
      trial_end: null,
      latest_invoice: { id: "in_1" },
      items: {
        data: [
          {
            price: { id: "price_1" },
            quantity: 1,
            current_period_start: 1_780_000_000,
            current_period_end: 1_782_592_000,
          },
        ],
      },
      ...overrides,
    }) as unknown as Stripe.Subscription;

  test("takes the period from its item", () => {
    expect(toProviderSubscription(subscription({}))).toEqual({
      id: "sub_1",
      customerId: "cus_1",
      priceId: "price_1",
      status: "active",
      quantity: 1,
      currentPeriodStart: new Date(1_780_000_000_000),
      currentPeriodEnd: new Date(1_782_592_000_000),
      cancelAtPeriodEnd: true,
      cancelAt: null,
      canceledAt: new Date(1_780_000_100_000),
      cancellationReason: "cancellation_requested",
      endedAt: null,
      trialStart: null,
      trialEnd: null,
      latestInvoiceId: "in_1",
      createdAt: new Date(1_780_000_000_000),
    });
  });

  test("refuses a subscription that is not one item", () => {
    expect(() =>
      toProviderSubscription(
        subscription({
          items: { data: [] },
        } as unknown as Partial<Stripe.Subscription>),
      ),
    ).toThrow("only one is supported");
  });
});

describe("the object an event's topic is about", () => {
  test("a charge event is about its payment, an invoice payment about its invoice", () => {
    expect(
      toProviderEvent(
        event("charge.failed", {
          id: "ch_1",
          object: "charge",
          payment_intent: "pi_1",
          customer: "cus_1",
        }),
      ),
    ).toMatchObject({
      topic: "payment",
      objectId: "pi_1",
      customerId: "cus_1",
    });
    expect(
      toProviderEvent(
        event("invoice_payment.paid", {
          id: "inpay_1",
          object: "invoice_payment",
          invoice: "in_1",
        }),
      ),
    ).toMatchObject({ topic: "invoice", objectId: "in_1" });
  });
});

describe("reading a Stripe invoice", () => {
  const invoice = (overrides: Partial<Stripe.Invoice>): Stripe.Invoice =>
    ({
      id: "in_1",
      object: "invoice",
      customer: "cus_1",
      parent: {
        type: "subscription_details",
        subscription_details: { subscription: "sub_1" },
      },
      number: "KB-0001",
      status: "paid",
      billing_reason: "subscription_cycle",
      currency: "usd",
      subtotal: 2_000,
      total: 2_400,
      total_taxes: [
        { amount: 300, tax_behavior: "exclusive" },
        { amount: 100, tax_behavior: "exclusive" },
      ],
      amount_due: 2_400,
      amount_paid: 2_400,
      amount_remaining: 0,
      period_start: 1_780_000_000,
      period_end: 1_782_592_000,
      customer_name: "Ada",
      customer_address: null,
      hosted_invoice_url: "https://invoice.stripe.test/in_1",
      invoice_pdf: null,
      due_date: null,
      status_transitions: {
        finalized_at: 1_780_000_000,
        paid_at: 1_780_000_060,
        voided_at: null,
        marked_uncollectible_at: null,
      },
      payments: {
        data: [
          { status: "canceled", payment: { payment_intent: "pi_0" } },
          { status: "paid", payment: { payment_intent: { id: "pi_1" } } },
        ],
      },
      created: 1_780_000_000,
      ...overrides,
    }) as unknown as Stripe.Invoice;

  const line = (price: string | null) =>
    ({
      pricing: price ? { price_details: { price, product: "prod_1" } } : null,
    }) as unknown as Stripe.InvoiceLineItem;

  test("adds up its taxes and keeps its subscription, prices and paid payments", () => {
    expect(
      toProviderInvoice(invoice({}), [
        line("price_1"),
        line("price_1"),
        line(null),
      ]),
    ).toMatchObject({
      id: "in_1",
      customerId: "cus_1",
      subscriptionId: "sub_1",
      status: "paid",
      tax: 400,
      total: 2_400,
      paidAt: new Date(1_780_000_060_000),
      priceIds: ["price_1"],
      paymentIds: ["pi_1"],
    });
  });

  test("an invoice of its own has no subscription", () => {
    expect(
      toProviderInvoice(invoice({ parent: null, total_taxes: null }), [])
        .subscriptionId,
    ).toBeNull();
  });
});

describe("reading a Stripe payment", () => {
  const charge = (overrides: Record<string, unknown>) =>
    ({
      id: "ch_1",
      object: "charge",
      status: "succeeded",
      amount: 2_400,
      amount_refunded: 0,
      currency: "usd",
      outcome: { type: "authorized", risk_level: "normal" },
      failure_code: null,
      failure_message: null,
      balance_transaction: { id: "txn_1", fee: 100, net: 2_300 },
      payment_method_details: {
        type: "card",
        card: { brand: "visa", last4: "4242" },
      },
      created: 1_780_000_060,
      ...overrides,
    }) as unknown as Stripe.Charge;

  test("takes the card from the latest attempt and the fee from each", () => {
    const declined = charge({
      id: "ch_0",
      status: "failed",
      failure_code: "card_declined",
      balance_transaction: null,
      payment_method_details: {
        type: "card",
        card: { brand: "mastercard", last4: "0002" },
      },
      created: 1_780_000_000,
    });

    expect(
      toProviderPayment(
        {
          id: "pi_1",
          object: "payment_intent",
          customer: "cus_1",
          status: "succeeded",
          amount: 2_400,
          amount_received: 2_400,
          currency: "usd",
          last_payment_error: null,
          latest_charge: "ch_1",
          created: 1_780_000_000,
        } as unknown as Stripe.PaymentIntent,
        [declined, charge({})],
        "in_1",
      ),
    ).toMatchObject({
      id: "pi_1",
      customerId: "cus_1",
      invoiceId: "in_1",
      cardBrand: "visa",
      cardLast4: "4242",
      succeededAt: new Date(1_780_000_060_000),
      attempts: [
        { id: "ch_0", status: "failed", fee: null, transactionId: null },
        { id: "ch_1", fee: 100, net: 2_300, transactionId: "txn_1" },
      ],
    });
  });
});
