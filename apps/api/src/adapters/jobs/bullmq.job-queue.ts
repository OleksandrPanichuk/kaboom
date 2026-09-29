import {
  type Job as BullJob,
  type JobsOptions,
  Queue,
  UnrecoverableError,
  Worker,
} from "bullmq";

import { make } from "@/core/registry";
import { getLogger } from "@/infrastructure";
import type { RedisConnection } from "@/infrastructure/redis";
import type { Job } from "@/platform/jobs/job";
import type { EnqueueJobOptions, JobMeta } from "@/platform/jobs/job.typedefs";
import {
  JobQueueUnavailableError,
  UnprocessableJobError,
} from "@/platform/jobs/jobs.errors";
import { JobQueue } from "@/platform/jobs/ports/job-queue";
import { type JobOutcome, Metrics } from "@/platform/metrics/ports/metrics";

const DEFAULT_ATTEMPTS = 5;
const DEFAULT_BACKOFF_MS = 2_000;

type Dispatch = Map<string, (raw: BullJob) => Promise<void>>;

export class BullMqJobQueue extends JobQueue {
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private readonly dispatch = new Map<string, Dispatch>();

  constructor(
    private readonly connection: RedisConnection,
    private readonly keyPrefix: string,
  ) {
    super();
  }

  public async enqueue<T>(
    job: Job<T>,
    payload: T,
    options?: EnqueueJobOptions,
  ): Promise<void> {
    try {
      await this.queue(job.queue).add(
        job.name,
        payload,
        this.toJobsOptions({ ...job.defaults, ...options }),
      );
    } catch (cause) {
      getLogger().error(
        { component: "BullMqJobQueue", job: job.name, err: cause },
        "failed to enqueue job",
      );

      throw new JobQueueUnavailableError(cause);
    }
  }

  public process<T>(job: Job<T>): void {
    const dispatch = this.dispatchFor(job.queue);

    if (dispatch.has(job.name)) {
      throw new Error(`Job "${job.name}" already has a registered handler`);
    }

    dispatch.set(job.name, (raw) => this.run(job, raw));

    this.worker(job.queue);
  }

  public async schedule<T>(job: Job<T>): Promise<void> {
    const schedule = job.schedule;

    if (!schedule) return;

    const schedulerId = schedule.jobId ?? job.name;

    try {
      await this.queue(job.queue).upsertJobScheduler(
        schedulerId,
        { pattern: schedule.pattern },
        {
          name: job.name,
          data: schedule.payload,
          opts: this.toJobsOptions({ ...job.defaults }),
        },
      );
    } catch (cause) {
      getLogger().error(
        { component: "BullMqJobQueue", job: job.name, err: cause },
        "failed to schedule job",
      );

      throw new JobQueueUnavailableError(cause);
    }
  }

  public async verify(): Promise<void> {
    await this.connection.connect();

    if (!(await this.connection.ping())) {
      throw new JobQueueUnavailableError("redis ping failed");
    }
  }

  public async close(): Promise<void> {
    await Promise.all(
      [...this.workers.values()].map((worker) => worker.close()),
    );
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));

    this.workers.clear();
    this.queues.clear();
    this.dispatch.clear();

    await this.connection.close();
  }

  private async run<T>(job: Job<T>, raw: BullJob): Promise<void> {
    const startedAt = performance.now();

    const meta: JobMeta = {
      jobId: raw.id ?? "unknown",
      name: job.name,
      queue: job.queue,
      attempts: raw.attemptsMade + 1,
    };

    const result = job.schema.safeParse(raw.data);

    if (!result.success) {
      const invalid = new UnprocessableJobError(
        `Invalid payload for job "${job.name}": ${result.error.message}`,
        result.error,
      );

      await job.failed(invalid, meta);
      this.measure(job, "failed", startedAt);

      throw new UnrecoverableError(invalid.message);
    }

    try {
      await job.handle(result.data, meta);
      this.measure(job, "done", startedAt);
    } catch (cause) {
      const unprocessable = cause instanceof UnprocessableJobError;
      const final = unprocessable || meta.attempts >= (raw.opts.attempts ?? 1);

      if (final) {
        await job.failed(cause, meta, result.data);
      }

      this.measure(job, final ? "failed" : "retried", startedAt);

      if (unprocessable) {
        throw new UnrecoverableError(cause.message);
      }

      throw cause;
    }
  }

  private measure<T>(
    job: Job<T>,
    outcome: JobOutcome,
    startedAt: number,
  ): void {
    make(Metrics).recordJob({
      job: job.name,
      queue: job.queue,
      outcome,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
    });
  }

  private queue(name: string): Queue {
    let queue = this.queues.get(name);

    if (!queue) {
      queue = new Queue(name, {
        connection: this.connection.instance,
        prefix: this.keyPrefix,
      });

      queue.on("error", (error) => {
        getLogger().error(
          { component: "BullMqJobQueue", queue: name, err: error },
          "queue error",
        );
      });

      this.queues.set(name, queue);
    }

    return queue;
  }

  private worker(name: string): Worker {
    let worker = this.workers.get(name);

    if (!worker) {
      const dispatch = this.dispatchFor(name);

      worker = new Worker(
        name,
        async (raw) => {
          const run = dispatch.get(raw.name);

          if (!run) {
            throw new UnrecoverableError(
              `No handler registered for job "${raw.name}"`,
            );
          }

          await run(raw);
        },
        {
          connection: this.connection.instance,
          prefix: this.keyPrefix,
        },
      );

      worker.on("failed", (raw, error) => {
        getLogger().error(
          {
            component: "BullMqJobQueue",
            queue: name,
            job: raw?.name,
            jobId: raw?.id,
            attempts: raw?.attemptsMade,
            err: error,
          },
          "job failed",
        );
      });

      worker.on("error", (error) => {
        getLogger().error(
          { component: "BullMqJobQueue", queue: name, err: error },
          "worker error",
        );
      });

      this.workers.set(name, worker);
    }

    return worker;
  }

  private dispatchFor(name: string): Dispatch {
    let dispatch = this.dispatch.get(name);

    if (!dispatch) {
      dispatch = new Map();
      this.dispatch.set(name, dispatch);
    }

    return dispatch;
  }

  private toJobsOptions(options: EnqueueJobOptions): JobsOptions {
    return {
      jobId: options.jobId,
      delay: options.delayMs,
      attempts: options.attempts ?? DEFAULT_ATTEMPTS,
      backoff: options.backoff
        ? { type: options.backoff.type, delay: options.backoff.delayMs }
        : { type: "exponential", delay: DEFAULT_BACKOFF_MS },
      removeOnComplete: true,
      removeOnFail: { count: 1_000 },
    };
  }
}
