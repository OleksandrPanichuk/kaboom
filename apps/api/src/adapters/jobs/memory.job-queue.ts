import { getLogger } from "@/infrastructure";
import type { Job } from "@/platform/jobs/job";
import type { EnqueueJobOptions, JobMeta } from "@/platform/jobs/job.typedefs";
import { UnprocessableJobError } from "@/platform/jobs/jobs.errors";
import { JobQueue } from "@/platform/jobs/ports/job-queue";

export class MemoryJobQueue extends JobQueue {
  private readonly jobs = new Map<string, Job<unknown>>();

  public async enqueue<T>(
    job: Job<T>,
    payload: T,
    options?: EnqueueJobOptions,
  ): Promise<void> {
    if (!this.jobs.has(job.name)) {
      getLogger().warn(
        { component: "MemoryJobQueue", job: job.name },
        "job enqueued with no registered handler; discarding",
      );

      return;
    }

    const data = this.parse(job, payload);
    const meta: JobMeta = {
      jobId: options?.jobId ?? crypto.randomUUID(),
      name: job.name,
      queue: job.queue,
      attempts: 1,
    };

    try {
      await job.handle(data, meta);
    } catch (error) {
      await job.failed(error, meta, data);
    }
  }

  public process<T>(job: Job<T>): void {
    this.jobs.set(job.name, job);
  }

  public schedule<T>(job: Job<T>): Promise<void> {
    if (job.schedule) {
      getLogger().debug(
        { component: "MemoryJobQueue", job: job.name },
        "schedules do not run in memory; skipping",
      );
    }

    return Promise.resolve();
  }

  public close(): Promise<void> {
    this.jobs.clear();

    return Promise.resolve();
  }

  private parse<T>(job: Job<T>, payload: unknown): T {
    const result = job.schema.safeParse(payload);

    if (!result.success) {
      throw new UnprocessableJobError(
        `Invalid payload for job "${job.name}"`,
        result.error,
      );
    }

    return result.data;
  }
}
