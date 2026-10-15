import type { BillingEventTopic } from "@/db";

export const STRIPE_API_VERSION = "2026-09-30.endive";

export const STRIPE_MAX_NETWORK_RETRIES = 2;

export const STRIPE_LOOKUP_KEYS_PER_REQUEST = 10;

export const STRIPE_PAGE_SIZE = 100;

export const STRIPE_MAX_LIST = 1_000;

export const STRIPE_EVENT_TYPES_PER_REQUEST = 20;

export const STRIPE_SIGNATURE_HEADER = "stripe-signature";

export const STRIPE_USER_ID_METADATA_KEY = "user_id";

export const STRIPE_EVENT_TOPICS: Readonly<Record<string, BillingEventTopic>> =
  {
    "customer.updated": "customer",
    "customer.deleted": "customer",
    "setup_intent.succeeded": "customer",
    "payment_method.attached": "customer",
    "payment_method.detached": "customer",
    "customer.tax_id.created": "tax_id",
    "customer.tax_id.updated": "tax_id",
    "customer.tax_id.deleted": "tax_id",
    "customer.subscription.created": "subscription",
    "customer.subscription.updated": "subscription",
    "customer.subscription.deleted": "subscription",
    "customer.subscription.paused": "subscription",
    "customer.subscription.resumed": "subscription",
    "invoice.finalized": "invoice",
    "invoice.paid": "invoice",
    "invoice.payment_failed": "invoice",
    "invoice.payment_action_required": "invoice",
    "invoice.finalization_failed": "invoice",
    "invoice.voided": "invoice",
    "invoice.marked_uncollectible": "invoice",
    "invoice_payment.paid": "invoice",
    "payment_intent.succeeded": "payment",
    "payment_intent.payment_failed": "payment",
    "payment_intent.processing": "payment",
    "payment_intent.canceled": "payment",
    "payment_intent.requires_action": "payment",
    "charge.succeeded": "payment",
    "charge.failed": "payment",
    "refund.created": "refund",
    "refund.updated": "refund",
    "refund.failed": "refund",
    "charge.dispute.created": "dispute",
    "charge.dispute.updated": "dispute",
    "charge.dispute.closed": "dispute",
    "charge.dispute.funds_withdrawn": "dispute",
    "charge.dispute.funds_reinstated": "dispute",
  };
