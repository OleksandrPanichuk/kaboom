import type { PublishCheck } from "@repo/scoring";

import { make } from "@/core/registry";
import { Metrics } from "@/platform/metrics";

import {
  DesignTestsBusyError,
  DesignTestsTimedOutError,
} from "./design-testing.errors";
import {
  DesignTester,
  type DesignTestRequest,
  type DesignTestResult,
} from "./ports";

const outcomeOf = (error: unknown): string =>
  error instanceof DesignTestsBusyError
    ? "busy"
    : error instanceof DesignTestsTimedOutError
      ? "timed_out"
      : "failed";

export class MeasuredDesignTester extends DesignTester {
  constructor(public readonly inner: DesignTester) {
    super();
  }

  public test(request: DesignTestRequest): Promise<DesignTestResult> {
    return this.measure("test", () => this.inner.test(request));
  }

  public check(content: unknown): Promise<PublishCheck> {
    return this.measure("check", () => this.inner.check(content));
  }

  public close(): Promise<void> {
    return this.inner.close();
  }

  private async measure<T>(task: string, run: () => Promise<T>): Promise<T> {
    const metrics = make(Metrics);
    const startedAt = performance.now();
    let outcome = "done";

    try {
      return await run();
    } catch (error) {
      outcome = outcomeOf(error);

      throw error;
    } finally {
      metrics.count("designTests", 1, { task, outcome });
      metrics.observe("designTestDuration", performance.now() - startedAt, {
        task,
      });
    }
  }
}
