import { CloudWatchMetrics } from "@/adapters/metrics/cloudwatch";
import { MemoryMetrics } from "@/adapters/metrics/memory.metrics";
import { NoopMetrics } from "@/adapters/metrics/noop.metrics";
import { OtlpMetrics, parseHeaders } from "@/adapters/metrics/otlp";
import { type Env, NodeEnv } from "@/configs";
import { SECOND } from "@/constants";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { Metrics } from "./ports";

const chooseMetrics = (env: Env): Metrics | null => {
  if (env.NODE_ENV === NodeEnv.Test) return new MemoryMetrics();

  if (env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT) {
    return new OtlpMetrics({
      url: env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
      headers: parseHeaders(env.OTEL_EXPORTER_OTLP_HEADERS),
      serviceName: env.APP_SLUG,
      environment: env.NODE_ENV,
      exportIntervalMs: env.METRICS_EXPORT_SECONDS * SECOND,
    });
  }

  if (env.CLOUDWATCH_METRICS_NAMESPACE) {
    return new CloudWatchMetrics({
      namespace: env.CLOUDWATCH_METRICS_NAMESPACE,
      environment: env.NODE_ENV,
      flushIntervalMs: env.CLOUDWATCH_METRICS_FLUSH_SECONDS * SECOND,
    });
  }

  return null;
};

export const metricsModule = defineModule({
  name: "metrics",

  register: ({ env, logger }) => {
    const chosen = chooseMetrics(env);

    if (!chosen) {
      logger.info(
        "neither OTEL_EXPORTER_OTLP_METRICS_ENDPOINT nor CLOUDWATCH_METRICS_NAMESPACE is set; metrics are not recorded",
      );
    }

    const metrics = chosen ?? new NoopMetrics();

    bind(Metrics, () => metrics);

    return { metrics };
  },

  start: ({ state }) => state.metrics.start(),

  shutdown: ({ state }) => state.metrics.close(),
});
