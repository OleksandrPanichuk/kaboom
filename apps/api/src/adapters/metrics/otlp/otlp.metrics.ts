import type { Counter, Histogram, Meter } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";

import { getLogger } from "@/infrastructure";
import {
  type CounterName,
  type GaugeName,
  type GaugeReader,
  type HistogramName,
  type LabelsOf,
  METRICS,
} from "@/platform/metrics/metrics.catalogue";
import { Metrics } from "@/platform/metrics/ports/metrics";

import type { OtlpMetricsOptions } from "./otlp.typedefs";

export class OtlpMetrics extends Metrics {
  private readonly provider: MeterProvider;

  private readonly meter: Meter;

  private readonly counters = new Map<CounterName, Counter>();

  private readonly histograms = new Map<HistogramName, Histogram>();

  constructor(options: OtlpMetricsOptions) {
    super();

    this.provider = new MeterProvider({
      resource: resourceFromAttributes({
        "service.name": options.serviceName,
        "deployment.environment.name": options.environment,
      }),
      readers: [
        new PeriodicExportingMetricReader({
          exporter:
            options.exporter ??
            new OTLPMetricExporter({
              url: options.url,
              headers: { ...options.headers },
            }),
          exportIntervalMillis: options.exportIntervalMs,
        }),
      ],
    });
    this.meter = this.provider.getMeter(options.serviceName);
  }

  public count<Name extends CounterName>(
    name: Name,
    value: number,
    labels: LabelsOf<Name>,
  ): void {
    let counter = this.counters.get(name);

    if (!counter) {
      const { name: exported, unit, description } = METRICS[name];

      counter = this.meter.createCounter(exported, { unit, description });
      this.counters.set(name, counter);
    }

    counter.add(value, labels);
  }

  public observe<Name extends HistogramName>(
    name: Name,
    value: number,
    labels: LabelsOf<Name>,
  ): void {
    let histogram = this.histograms.get(name);

    if (!histogram) {
      const definition = METRICS[name];

      histogram = this.meter.createHistogram(definition.name, {
        unit: definition.unit,
        description: definition.description,
        ...("buckets" in definition
          ? { advice: { explicitBucketBoundaries: [...definition.buckets] } }
          : {}),
      });
      this.histograms.set(name, histogram);
    }

    histogram.record(value, labels);
  }

  public gauge(name: GaugeName, read: GaugeReader): void {
    const { name: exported, unit, description } = METRICS[name];

    this.meter
      .createObservableGauge(exported, { unit, description })
      .addCallback(async (result) => {
        try {
          result.observe(await read());
        } catch (cause) {
          getLogger().warn(
            { component: "OtlpMetrics", gauge: name, err: cause },
            "a gauge could not be read",
          );
        }
      });
  }

  public flush(): Promise<void> {
    return this.provider.forceFlush();
  }

  public async close(): Promise<void> {
    try {
      await this.provider.shutdown();
    } catch (cause) {
      getLogger().error(
        { component: "OtlpMetrics", err: cause },
        "the last metrics were not sent",
      );
    }
  }
}
