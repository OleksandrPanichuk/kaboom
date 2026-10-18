import type { PushMetricExporter } from "@opentelemetry/sdk-metrics";

export interface OtlpMetricsOptions {
  url: string;
  headers: Readonly<Record<string, string>>;
  serviceName: string;
  environment: string;
  exportIntervalMs: number;
  exporter?: PushMetricExporter;
}
