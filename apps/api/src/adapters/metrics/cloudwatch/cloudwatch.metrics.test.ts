import type { PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { describe, expect, test } from "bun:test";

import { CLOUDWATCH_MAX_METRICS_PER_REQUEST } from "./cloudwatch.constants";
import { CloudWatchMetrics } from "./cloudwatch.metrics";
import type { MetricsSender } from "./cloudwatch.typedefs";

const NOW = new Date("2026-09-24T12:00:00.000Z");

const recorder = (fail = false) => {
  const sent: Array<PutMetricDataCommand["input"]> = [];
  const client: MetricsSender = {
    send: (command) => {
      sent.push(command.input);

      return fail
        ? Promise.reject(new Error("no credentials"))
        : Promise.resolve({});
    },
  };
  const metrics = new CloudWatchMetrics({
    namespace: "acme",
    environment: "production",
    flushIntervalMs: 60_000,
    client,
    now: () => NOW,
  });

  return { sent, metrics };
};

const request = (
  metrics: CloudWatchMetrics,
  durationMs: number,
  status = "2xx",
  route = "/api/users/me",
) => {
  const labels = { method: "GET", route, status_class: status };

  metrics.count("httpRequests", 1, labels);
  metrics.observe("httpDuration", durationMs, labels);
};

describe("CloudWatchMetrics", () => {
  test("aggregates requests with the same dimensions into one statistic set", async () => {
    const { sent, metrics } = recorder();

    request(metrics, 10);
    request(metrics, 30);
    request(metrics, 20);
    await metrics.flush();

    expect(sent).toHaveLength(1);
    expect(sent[0]?.Namespace).toBe("acme");

    const datum = (name: string) =>
      sent[0]?.MetricData?.find((metric) => metric.MetricName === name);

    expect(datum("http_request_duration")).toEqual({
      MetricName: "http_request_duration",
      Unit: "Milliseconds",
      Timestamp: NOW,
      Dimensions: [
        { Name: "Environment", Value: "production" },
        { Name: "method", Value: "GET" },
        { Name: "route", Value: "/api/users/me" },
        { Name: "status_class", Value: "2xx" },
      ],
      StatisticValues: { SampleCount: 3, Sum: 60, Minimum: 10, Maximum: 30 },
    });
    expect(datum("http_requests")?.StatisticValues).toEqual({
      SampleCount: 3,
      Sum: 3,
      Minimum: 1,
      Maximum: 1,
    });
  });

  test("keeps different dimensions apart", async () => {
    const { sent, metrics } = recorder();

    request(metrics, 10, "2xx");
    request(metrics, 10, "5xx");
    metrics.observe("jobDuration", 5, {
      job: "notifications.send-email",
      queue: "notifications",
      outcome: "failed",
    });
    await metrics.flush();

    const names = (sent[0]?.MetricData ?? []).map(
      (datum) =>
        `${datum.MetricName}:${datum.Dimensions?.map((d) => d.Value).join(",")}`,
    );

    expect(names).toHaveLength(5);
    expect(names).toContain("http_requests:production,GET,/api/users/me,5xx");
    expect(names).toContain(
      "job_duration:production,notifications.send-email,notifications,failed",
    );
  });

  test("splits a large flush into requests CloudWatch accepts", async () => {
    const { sent, metrics } = recorder();

    for (let i = 0; i < CLOUDWATCH_MAX_METRICS_PER_REQUEST; i += 1) {
      request(metrics, 1, "2xx", `/api/r${i}`);
    }
    await metrics.flush();

    expect(sent).toHaveLength(2);
    expect(sent.map((input) => input.MetricData?.length)).toEqual([
      CLOUDWATCH_MAX_METRICS_PER_REQUEST,
      CLOUDWATCH_MAX_METRICS_PER_REQUEST,
    ]);
  });

  test("sends nothing when nothing was recorded", async () => {
    const { sent, metrics } = recorder();

    await metrics.flush();

    expect(sent).toHaveLength(0);
  });

  test("starts a fresh window after each flush", async () => {
    const { sent, metrics } = recorder();

    request(metrics, 10);
    await metrics.flush();
    await metrics.flush();

    expect(sent).toHaveLength(1);
  });

  test("never throws when CloudWatch refuses the request", async () => {
    const { sent, metrics } = recorder(true);

    request(metrics, 10);

    expect(await metrics.flush().then(() => "settled")).toBe("settled");
    expect(sent).toHaveLength(1);
  });

  test("reads each gauge when it flushes, and skips one that throws", async () => {
    const { sent, metrics } = recorder();

    metrics.gauge("billingEventsFailed", () => 3);
    metrics.gauge("billingOldestPending", () => {
      throw new Error("database down");
    });
    await metrics.flush();

    expect(sent[0]?.MetricData).toEqual([
      expect.objectContaining({
        MetricName: "billing_events_failed",
        Unit: "Count",
        StatisticValues: { SampleCount: 1, Sum: 3, Minimum: 3, Maximum: 3 },
      }),
    ]);
  });

  test("flushes what is left on close", async () => {
    const { sent, metrics } = recorder();

    await metrics.start();
    request(metrics, 10);
    await metrics.close();

    expect(sent).toHaveLength(1);
  });
});
