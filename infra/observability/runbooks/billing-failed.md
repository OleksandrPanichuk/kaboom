# Billing events failed

A billing webhook event failed every attempt. A payment, subscription or refund may not be reflected in the app.

## Check

- `select id, type, last_error from billing_events where status = 'failed'`.

## Fix

- Fix the cause, then let `ReconcileBillingJob` (03:30) queue it again, or redeliver the event from the Stripe Dashboard.
