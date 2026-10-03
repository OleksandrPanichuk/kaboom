import { describe, expect, test } from "bun:test";
import z from "zod";

import type { MemoryErrorReporter } from "@/adapters/error-reporting/memory.error-reporter";
import { ErrorReporter } from "@/core/error-reporting";
import { make } from "@/core/registry";
import { Service } from "@/core/service";
import { Job } from "@/platform/jobs";
import { runWithRequestContext } from "@/shared";

const reports = () => (make(ErrorReporter) as MemoryErrorReporter).reports();

class ProbeService extends Service {
  public fail(error: Error): void {
    this.captureException(error, { tags: { step: "charge" } });
  }
}

class ProbeJob extends Job<{ value: string }> {
  public readonly name = "probe.job";
  public readonly queue = "probe-queue";
  public readonly schema = z.object({ value: z.string() });

  public handle(): Promise<void> {
    return Promise.resolve();
  }
}

describe("this.captureException", () => {
  test("names the class as the source and picks up the request id", () => {
    const error = new Error("boom");

    runWithRequestContext({ requestId: "req-9" }, () =>
      new ProbeService().fail(error),
    );

    expect(reports()).toEqual([
      {
        error,
        report: {
          source: "ProbeService",
          requestId: "req-9",
          tags: { step: "charge" },
        },
      },
    ]);
  });

  test("works outside a request", () => {
    new ProbeService().fail(new Error("boom"));

    expect(reports()[0]?.report.requestId).toBeUndefined();
  });

  test("gives a job's failure its name, queue and attempts", async () => {
    const error = new Error("boom");

    await new ProbeJob().failed(error, {
      jobId: "42",
      name: "probe.job",
      queue: "probe-queue",
      attempts: 3,
    });

    expect(reports()[0]?.report).toEqual({
      source: "job",
      tags: { job: "probe.job", queue: "probe-queue" },
      extra: { jobId: "42", attempts: 3 },
    });
  });
});
