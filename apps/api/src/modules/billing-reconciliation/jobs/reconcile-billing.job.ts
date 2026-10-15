import z from "zod";

import { makeService } from "@/core/registry";
import { Job, type JobSchedule } from "@/platform/jobs";

import {
  BILLING_RECONCILIATION_QUEUE,
  BillingReconciliationQueueJobs,
  RECONCILE_BILLING_PATTERN,
  RECONCILE_BILLING_WINDOW_MS,
} from "../billing-reconciliation.constants";
import { BillingReconciliationService } from "../billing-reconciliation.service";

export const ReconcileBillingPayloadSchema = z.object({});

export type ReconcileBillingPayload = z.infer<
  typeof ReconcileBillingPayloadSchema
>;

export class ReconcileBillingJob extends Job<ReconcileBillingPayload> {
  public readonly name = BillingReconciliationQueueJobs.Reconcile;
  public readonly queue = BILLING_RECONCILIATION_QUEUE;
  public readonly schema = ReconcileBillingPayloadSchema;

  public readonly schedule: JobSchedule<ReconcileBillingPayload> = {
    pattern: RECONCILE_BILLING_PATTERN,
    payload: {},
  };

  private readonly billingReconciliationService = makeService(
    BillingReconciliationService,
  );

  public async handle(): Promise<void> {
    const since = new Date(Date.now() - RECONCILE_BILLING_WINDOW_MS);
    const result = await this.billingReconciliationService.reconcile(since);

    if (result.missed > 0 || result.queued > 0) {
      this.logger.warn(result, "reconciled billing events the webhooks missed");
    }
  }
}
