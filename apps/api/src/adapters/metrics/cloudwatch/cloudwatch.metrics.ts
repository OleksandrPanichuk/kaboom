import {
  CloudWatchClient,
  type MetricDatum,
  PutMetricDataCommand,
  type StandardUnit,
} from "@aws-sdk/client-cloudwatch";

import { getLogger } from "@/infrastructure";
import {
  type CounterName,
  type GaugeName,
  type GaugeReader,
  type HistogramName,
  type LabelsOf,
  type MetricName,
  METRICS,
} from "@/platform/metrics/metrics.catalogue";
import { Metrics } from "@/platform/metrics/ports/metrics";

import {
  CLOUDWATCH_MAX_METRICS_PER_REQUEST,
  CLOUDWATCH_REQUEST_TIMEOUT_MS,
} from "./cloudwatch.constants";
import { aggregateKey, chunk, toDatum, unitOf } from "./cloudwatch.helpers";
import type {
  Aggregate,
  CloudWatchMetricsOptions,
  Dimensions,
  MetricsSender,
} from "./cloudwatch.typedefs";

export class CloudWatchMetrics extends Metrics {
  private readonly client: MetricsSender;

  private readonly now: () => Date;

  private buffer = new Map<string, Aggregate>();

  private timer: ReturnType<typeof setInterval> | undefined;

  private readonly gauges = new Map<GaugeName, GaugeReader>();

  constructor(private readonly options: CloudWatchMetricsOptions) {
    super();

    this.client =
      options.client ??
      new CloudWatchClient({
        requestHandler: { requestTimeout: CLOUDWATCH_REQUEST_TIMEOUT_MS },
      });
    this.now = options.now ?? (() => new Date());
  }

  public count<Name extends CounterName>(
    name: Name,
    value: number,
    labels: LabelsOf<Name>,
  ): void {
    this.record(name, value, labels);
  }

  public observe<Name extends HistogramName>(
    name: Name,
    value: number,
    labels: LabelsOf<Name>,
  ): void {
    this.record(name, value, labels);
  }

  public gauge(name: GaugeName, read: GaugeReader): void {
    this.gauges.set(name, read);
  }

  public start(): Promise<void> {
    this.timer ??= setInterval(() => {
      this.flush().catch(() => undefined);
    }, this.options.flushIntervalMs);
    this.timer.unref();

    return Promise.resolve();
  }

  public async flush(): Promise<void> {
    await this.readGauges();

    if (this.buffer.size === 0) return;

    const aggregates = [...this.buffer.values()];
    const timestamp = this.now();

    this.buffer = new Map();

    const batches = chunk(
      aggregates.map((aggregate) => toDatum(aggregate, timestamp)),
      CLOUDWATCH_MAX_METRICS_PER_REQUEST,
    );

    await Promise.all(batches.map((data) => this.send(data)));
  }

  public async close(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    await this.flush();
  }

  private record(
    name: MetricName,
    value: number,
    labels: Readonly<Record<string, string>>,
  ): void {
    const definition = METRICS[name];

    this.add(
      definition.name,
      unitOf(definition.unit),
      {
        Environment: this.options.environment,
        ...labels,
      },
      value,
    );
  }

  private async readGauges(): Promise<void> {
    await Promise.all(
      [...this.gauges].map(async ([name, read]) => {
        try {
          this.record(name, await read(), {});
        } catch (cause) {
          getLogger().warn(
            { component: "CloudWatchMetrics", gauge: name, err: cause },
            "a gauge could not be read",
          );
        }
      }),
    );
  }

  private add(
    name: string,
    unit: StandardUnit,
    dimensions: Dimensions,
    value: number,
  ): void {
    const key = aggregateKey(name, dimensions);
    const current = this.buffer.get(key);

    if (!current) {
      this.buffer.set(key, {
        name,
        unit,
        dimensions,
        count: 1,
        sum: value,
        min: value,
        max: value,
      });

      return;
    }

    current.count += 1;
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
  }

  private async send(data: MetricDatum[]): Promise<void> {
    try {
      await this.client.send(
        new PutMetricDataCommand({
          Namespace: this.options.namespace,
          MetricData: data,
        }),
      );
    } catch (cause) {
      getLogger().error(
        {
          component: "CloudWatchMetrics",
          dropped: data.length,
          err: cause,
        },
        "metrics were not sent",
      );
    }
  }
}
