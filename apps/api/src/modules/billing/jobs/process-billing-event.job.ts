import z from "zod";

import { makeRepository, makeService } from "@/core/registry";
import { type EnqueueJobOptions, Job, type JobMeta } from "@/platform/jobs";

import {
  BILLING_EVENT_ERROR_LENGTH,
  BILLING_EVENT_JOB_ATTEMPTS,
  BILLING_EVENT_JOB_BACKOFF_MS,
  BILLING_QUEUE,
  BillingQueueJobs,
} from "../billing.constants";
import { BillingEventsService } from "../billing-events.service";
import { BillingEventsRepository } from "../ports";

export const ProcessBillingEventPayloadSchema = z.object({
  eventId: z.uuid(),
});

export type ProcessBillingEventPayload = z.infer<
  typeof ProcessBillingEventPayloadSchema
>;

const describe = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).slice(
    0,
    BILLING_EVENT_ERROR_LENGTH,
  );

export class ProcessBillingEventJob extends Job<ProcessBillingEventPayload> {
  public readonly name = BillingQueueJobs.ProcessEvent;
  public readonly queue = BILLING_QUEUE;
  public readonly schema = ProcessBillingEventPayloadSchema;

  public readonly defaults: EnqueueJobOptions = {
    attempts: BILLING_EVENT_JOB_ATTEMPTS,
    backoff: { type: "exponential", delayMs: BILLING_EVENT_JOB_BACKOFF_MS },
  };

  private readonly events = makeRepository(BillingEventsRepository);

  private readonly billingEventsService = makeService(BillingEventsService);

  public async handle({ eventId }: ProcessBillingEventPayload): Promise<void> {
    try {
      await this.billingEventsService.process(eventId);
    } catch (error) {
      await this.events.recordError(eventId, describe(error), false);

      throw error;
    }
  }

  public override async failed(
    error: unknown,
    meta: JobMeta,
    payload?: ProcessBillingEventPayload,
  ): Promise<void> {
    await super.failed(error, meta);

    if (payload) {
      await this.events.recordError(payload.eventId, describe(error), true);
    }
  }
}
