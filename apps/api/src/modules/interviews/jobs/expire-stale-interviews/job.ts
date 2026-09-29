import { makeRepository, makeService } from "@/core/registry";
import { DesignsService } from "@/modules/designs";
import { Job, type JobSchedule } from "@/platform/jobs";

import {
  EXPIRE_STALE_INTERVIEWS_PATTERN,
  INTERVIEW_IDLE_MS,
  InterviewQueueJobs,
  INTERVIEWS_QUEUE,
} from "../../interviews.constants";
import { InterviewsService } from "../../interviews.service";
import { InterviewsRepository } from "../../ports";
import {
  type ExpireStaleInterviewsPayload,
  ExpireStaleInterviewsPayloadSchema,
} from "./schema";

export class ExpireStaleInterviewsJob extends Job<ExpireStaleInterviewsPayload> {
  public readonly name = InterviewQueueJobs.ExpireStale;
  public readonly queue = INTERVIEWS_QUEUE;
  public readonly schema = ExpireStaleInterviewsPayloadSchema;

  public readonly schedule: JobSchedule<ExpireStaleInterviewsPayload> = {
    pattern: EXPIRE_STALE_INTERVIEWS_PATTERN,
    payload: {},
  };

  private readonly interviews = makeRepository(InterviewsRepository);

  public async handle(): Promise<void> {
    const idle = await this.interviews.listIdle(
      new Date(Date.now() - INTERVIEW_IDLE_MS),
    );
    let expired = 0;

    for (const interview of idle) {
      const ended = await makeService(InterviewsService).commit(
        interview.id,
        async (emit) => {
          const updated = await this.interviews.markExpired(interview.id);

          if (!updated) return null;

          await makeService(DesignsService).lock(interview.designId);
          await emit("status", { status: updated.status });

          return updated;
        },
      );

      if (ended) expired += 1;
    }

    if (expired > 0) this.logger.info({ expired }, "expired idle interviews");
  }
}
