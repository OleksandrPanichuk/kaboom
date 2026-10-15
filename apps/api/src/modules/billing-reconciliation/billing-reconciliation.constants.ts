import { HOUR } from "@/constants";

export const BILLING_RECONCILIATION_QUEUE = "billing-reconciliation";

export enum BillingReconciliationQueueJobs {
  Reconcile = "billing-reconciliation.reconcile",
}

export const RECONCILE_BILLING_PATTERN = "30 3 * * *";

export const RECONCILE_BILLING_WINDOW_MS = 48 * HOUR;
