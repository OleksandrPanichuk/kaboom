import type z from "zod";

import { Injectable } from "@/core/injectable";
import { make } from "@/core/registry";

import type { EnqueueJobOptions, JobMeta, JobSchedule } from "./job.typedefs";
import { JobQueue } from "./ports/job-queue";

export abstract class Job<Payload> extends Injectable {
  public abstract readonly name: string;
  public abstract readonly queue: string;
  public abstract readonly schema: z.ZodType<Payload>;
  public readonly defaults?: EnqueueJobOptions;
  public readonly schedule?: JobSchedule<Payload>;

  public abstract handle(payload: Payload, meta: JobMeta): Promise<void>;

  public failed(
    error: unknown,
    meta: JobMeta,
    _payload?: Payload,
  ): void | Promise<void> {
    this.captureException(error, {
      source: "job",
      tags: { job: meta.name, queue: meta.queue },
      extra: { jobId: meta.jobId, attempts: meta.attempts },
    });
  }

  public dispatch(
    payload: Payload,
    options?: EnqueueJobOptions,
  ): Promise<void> {
    return make(JobQueue).enqueue(this, payload, options);
  }
}
