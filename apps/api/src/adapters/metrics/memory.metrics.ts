import type {
  CounterName,
  GaugeName,
  GaugeReader,
  HistogramName,
  LabelsOf,
  MetricName,
} from "@/platform/metrics/metrics.catalogue";
import { Metrics } from "@/platform/metrics/ports/metrics";

export interface RecordedMetric<Name extends MetricName = MetricName> {
  name: Name;
  value: number;
  labels: LabelsOf<Name>;
}

interface Recorded {
  name: MetricName;
  value: number;
  labels: Readonly<Record<string, string>>;
}

export class MemoryMetrics extends Metrics {
  private readonly recorded: Recorded[] = [];

  private readonly gauges = new Map<GaugeName, GaugeReader>();

  public count<Name extends CounterName>(
    name: Name,
    value: number,
    labels: LabelsOf<Name>,
  ): void {
    this.recorded.push({ name, value, labels });
  }

  public observe<Name extends HistogramName>(
    name: Name,
    value: number,
    labels: LabelsOf<Name>,
  ): void {
    this.recorded.push({ name, value, labels });
  }

  public gauge(name: GaugeName, read: GaugeReader): void {
    this.gauges.set(name, read);
  }

  public of<Name extends MetricName>(name: Name): Array<RecordedMetric<Name>> {
    return this.recorded.filter(
      (entry) => entry.name === name,
    ) as unknown as Array<RecordedMetric<Name>>;
  }

  public async read(name: GaugeName): Promise<number | null> {
    const reader = this.gauges.get(name);

    return reader ? reader() : null;
  }

  public clear(): void {
    this.recorded.length = 0;
  }
}
