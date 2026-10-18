import { Port } from "@/core/port";

import type {
  CounterName,
  GaugeName,
  GaugeReader,
  HistogramName,
  LabelsOf,
} from "../metrics.catalogue";

export abstract class Metrics extends Port {
  public abstract count<Name extends CounterName>(
    name: Name,
    value: number,
    labels: LabelsOf<Name>,
  ): void;

  public abstract observe<Name extends HistogramName>(
    name: Name,
    value: number,
    labels: LabelsOf<Name>,
  ): void;

  public abstract gauge(name: GaugeName, read: GaugeReader): void;

  public start(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
