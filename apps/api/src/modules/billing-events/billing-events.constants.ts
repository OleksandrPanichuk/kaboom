export const BILLING_EVENTS_QUEUE = "billing-events";

export enum BillingEventsQueueJobs {
  ProcessEvent = "billing.process-event",
}

export const BILLING_EVENT_JOB_ATTEMPTS = 8;

export const BILLING_EVENT_JOB_BACKOFF_MS = 5_000;

export const BILLING_EVENT_ERROR_LENGTH = 2_000;
