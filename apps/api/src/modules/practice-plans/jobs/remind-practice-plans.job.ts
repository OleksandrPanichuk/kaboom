import z from "zod";

import { makeService } from "@/core/registry";
import { Job, type JobSchedule } from "@/platform/jobs";

import {
  PRACTICE_PLANS_QUEUE,
  PracticePlansQueueJobs,
  REMIND_PRACTICE_PLANS_PATTERN,
} from "../practice-plans.constants";
import { PracticePlansService } from "../practice-plans.service";

export const RemindPracticePlansPayloadSchema = z.object({});

export type RemindPracticePlansPayload = z.infer<
  typeof RemindPracticePlansPayloadSchema
>;

export class RemindPracticePlansJob extends Job<RemindPracticePlansPayload> {
  public readonly name = PracticePlansQueueJobs.Remind;
  public readonly queue = PRACTICE_PLANS_QUEUE;
  public readonly schema = RemindPracticePlansPayloadSchema;

  public readonly schedule: JobSchedule<RemindPracticePlansPayload> = {
    pattern: REMIND_PRACTICE_PLANS_PATTERN,
    payload: {},
  };

  private readonly service = makeService(PracticePlansService);

  public async handle(): Promise<void> {
    const sent = await this.service.remind(new Date());

    if (sent > 0) this.logger.info({ sent }, "reminded people of their plan");
  }
}
