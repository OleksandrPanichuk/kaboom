import {
  DesignTestsBusyError,
  DesignTestsTimedOutError,
  DesignTestsUnavailableError,
} from "@/platform/design-testing/design-testing.errors";
import {
  DesignTester,
  type DesignTestRequest,
  type DesignTestResult,
} from "@/platform/design-testing/ports";

import type {
  PendingTest,
  WorkerDesignTesterOptions,
  WorkerReply,
} from "./worker.typedefs";

const BOOT_TIMEOUT_MS = 10_000;
const QUEUED_PER_WORKER = 4;

export class WorkerDesignTester extends DesignTester {
  private readonly idle: Worker[] = [];
  private readonly queue: PendingTest[] = [];
  private readonly running = new Map<Worker, PendingTest>();
  private booting = 0;
  private closed = false;

  constructor(private readonly options: WorkerDesignTesterOptions) {
    super();
  }

  public async start(): Promise<void> {
    const workers = await Promise.all(
      Array.from({ length: this.options.size }, () => this.boot()),
    );

    this.idle.push(...workers);
  }

  public healthy(): boolean {
    return this.idle.length + this.running.size > 0;
  }

  public test(request: DesignTestRequest): Promise<DesignTestResult> {
    if (this.closed) {
      return Promise.reject(
        new DesignTestsUnavailableError("The design tests have shut down"),
      );
    }

    const limit =
      this.options.maxQueued ?? this.options.size * QUEUED_PER_WORKER;

    if (this.queue.length >= limit) {
      return Promise.reject(
        new DesignTestsBusyError("Too many designs are waiting to be tested"),
      );
    }

    return new Promise((resolve, reject) => {
      const pending: PendingTest = {
        request,
        resolve,
        reject,
        timer: null,
        worker: null,
      };

      pending.timer = setTimeout(
        () => this.expire(pending),
        this.options.timeoutMs,
      );
      this.queue.push(pending);
      this.pump();
    });
  }

  public close(): Promise<void> {
    this.closed = true;

    const refusal = () =>
      new DesignTestsUnavailableError("The design tests have shut down");

    for (const pending of [...this.queue.splice(0), ...this.running.values()]) {
      this.settle(pending);
      pending.reject(refusal());
    }

    for (const worker of [...this.idle.splice(0), ...this.running.keys()]) {
      worker.terminate();
    }

    this.running.clear();

    return Promise.resolve();
  }

  private boot(): Promise<Worker> {
    this.booting += 1;

    return new Promise<Worker>((resolve, reject) => {
      const worker = new Worker(this.options.script.href);
      const fail = (message: string) => {
        clearTimeout(timer);
        worker.terminate();
        reject(new DesignTestsUnavailableError(message));
      };
      const timer = setTimeout(
        () => fail("A design test worker did not start in time"),
        this.options.bootTimeoutMs ?? BOOT_TIMEOUT_MS,
      );

      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        if (!("ready" in event.data)) return;

        clearTimeout(timer);
        worker.onmessage = null;
        worker.onerror = (failure: ErrorEvent) =>
          this.lose(worker, failure.message);
        resolve(worker);
      };
      worker.onerror = (failure: ErrorEvent) =>
        fail(`A design test worker failed to start: ${failure.message}`);
    }).finally(() => {
      this.booting -= 1;
    });
  }

  private replace(): void {
    if (this.closed) return;

    this.boot().then(
      (worker) => {
        if (this.closed) {
          worker.terminate();

          return;
        }

        this.idle.push(worker);
        this.pump();
      },
      (error: Error) => {
        if (this.healthy() || this.booting > 0) return;

        for (const pending of this.queue.splice(0)) {
          this.settle(pending);
          pending.reject(error);
        }
      },
    );
  }

  private lose(worker: Worker, message: string): void {
    worker.terminate();

    const index = this.idle.indexOf(worker);

    if (index >= 0) this.idle.splice(index, 1);

    const pending = this.running.get(worker);

    this.running.delete(worker);

    if (pending) {
      this.settle(pending);
      pending.reject(new Error(message));
    }

    this.replace();
  }

  private expire(pending: PendingTest): void {
    const index = this.queue.indexOf(pending);

    if (index >= 0) this.queue.splice(index, 1);

    const { worker } = pending;

    pending.timer = null;

    if (worker && this.running.get(worker) === pending) {
      this.running.delete(worker);
      worker.terminate();
      this.replace();
    }

    pending.reject(
      new DesignTestsTimedOutError(
        `The design's tests took longer than ${this.options.timeoutMs} ms`,
      ),
    );
  }

  private settle(pending: PendingTest): void {
    if (pending.timer) clearTimeout(pending.timer);

    pending.timer = null;
  }

  private pump(): void {
    while (!this.closed && this.idle.length > 0 && this.queue.length > 0) {
      this.dispatch(this.idle.pop()!, this.queue.shift()!);
    }
  }

  private dispatch(worker: Worker, pending: PendingTest): void {
    pending.worker = worker;
    this.running.set(worker, pending);

    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      if ("ready" in event.data || this.running.get(worker) !== pending) {
        return;
      }

      worker.onmessage = null;
      this.running.delete(worker);
      this.settle(pending);
      this.idle.push(worker);

      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.message));

      this.pump();
    };

    worker.postMessage(pending.request);
  }
}
