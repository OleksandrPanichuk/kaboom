import {
  AggregationTemporality,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { describe, expect, test } from "bun:test";

import { parseHeaders } from "./otlp.helpers";
import { OtlpMetrics } from "./otlp.metrics";

const recorder = () => {
  const exporter = new InMemoryMetricExporter(
    AggregationTemporality.CUMULATIVE,
  );
  const metrics = new OtlpMetrics({
    url: "http://collector.invalid/v1/metrics",
    headers: {},
    serviceName: "kaboom",
    environment: "test",
    exportIntervalMs: 60_000,
    exporter,
  });

  return { exporter, metrics };
};

const exported = (exporter: InMemoryMetricExporter) =>
  exporter
    .getMetrics()
    .flatMap((resource) => resource.scopeMetrics)
    .flatMap((scope) => scope.metrics);

describe("OtlpMetrics", () => {
  test("exports counters, histograms and gauges under their catalogue names", async () => {
    const { exporter, metrics } = recorder();

    metrics.count("httpRequests", 1, {
      method: "GET",
      route: "/api/users/me",
      status_class: "2xx",
    });
    metrics.observe("llmTurnDuration", 4200, { role: "interviewer" });
    metrics.gauge("billingEventsFailed", () => 2);
    await metrics.flush();

    const byName = new Map(
      exported(exporter).map((metric) => [metric.descriptor.name, metric]),
    );

    expect([...byName.keys()].sort()).toEqual([
      "billing_events_failed",
      "http_requests",
      "llm_turn_duration",
    ]);
    expect(byName.get("http_requests")?.dataPoints[0]).toMatchObject({
      value: 1,
      attributes: {
        method: "GET",
        route: "/api/users/me",
        status_class: "2xx",
      },
    });
    expect(byName.get("billing_events_failed")?.dataPoints[0]?.value).toBe(2);
    expect(byName.get("llm_turn_duration")?.descriptor.unit).toBe("ms");

    await metrics.close();
  });

  test("keeps exporting when a gauge cannot be read", async () => {
    const { exporter, metrics } = recorder();

    metrics.gauge("billingOldestPending", () => {
      throw new Error("database down");
    });
    metrics.count("productEvents", 1, { event: "sign_up" });

    expect(await metrics.flush().then(() => "flushed")).toBe("flushed");
    expect(
      exported(exporter).map((metric) => metric.descriptor.name),
    ).toContain("product_events");

    await metrics.close();
  });

  test("reads OTLP headers written as key=value pairs", () => {
    expect(
      parseHeaders("Authorization=Basic%20abc, X-Scope-OrgID = 42 ,bad"),
    ).toEqual({ Authorization: "Basic abc", "X-Scope-OrgID": "42" });
    expect(parseHeaders(undefined)).toEqual({});
  });
});
