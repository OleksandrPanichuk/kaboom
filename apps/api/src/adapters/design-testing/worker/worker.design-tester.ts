import {
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

export class WorkerDesignTester extends DesignTester {
  private readonly idle: Worker[] = [];
  private readonly queue: PendingTest[] = [];
  private readonly running = new Set<Worker>();
  private closed = false;

  constructor(private readonly options: WorkerDesignTesterOptions) {
    super();
  }

  public start(): void {
    for (let index = 0; index < this.options.size; index++) {
      this.idle.push(this.spawn());
    }
  }

  public test(request: DesignTestRequest): Promise<DesignTestResult> {
    if (this.closed) {
      return Promise.reject(
        new DesignTestsUnavailableError("The design tests have shut down"),
      );
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.pump();
    });
  }

  public close(): Promise<void> {
    this.closed = true;

    for (const pending of this.queue.splice(0)) {
      pending.reject(
        new DesignTestsUnavailableError("The design tests have shut down"),
      );
    }

    for (const worker of [...this.idle.splice(0), ...this.running]) {
      worker.terminate();
    }

    this.running.clear();

    return Promise.resolve();
  }

  private spawn(): Worker {
    return new Worker(this.options.script.href);
  }

  private pump(): void {
    while (!this.closed && this.idle.length > 0 && this.queue.length > 0) {
      this.dispatch(this.idle.pop()!, this.queue.shift()!);
    }
  }

  private dispatch(worker: Worker, pending: PendingTest): void {
    this.running.add(worker);

    const settle = (replace: boolean) => {
      clearTimeout(timer);
      worker.onmessage = null;
      worker.onerror = null;
      this.running.delete(worker);

      if (replace) {
        worker.terminate();
      }

      if (!this.closed) {
        this.idle.push(replace ? this.spawn() : worker);
        this.pump();
      }
    };

    const timer = setTimeout(() => {
      settle(true);
      pending.reject(
        new DesignTestsTimedOutError(
          `The design's tests took longer than ${this.options.timeoutMs} ms`,
        ),
      );
    }, this.options.timeoutMs);

    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      settle(false);

      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.message));
    };

    worker.onerror = (event: ErrorEvent) => {
      settle(true);
      pending.reject(new Error(event.message));
    };

    worker.postMessage(pending.request);
  }
}
