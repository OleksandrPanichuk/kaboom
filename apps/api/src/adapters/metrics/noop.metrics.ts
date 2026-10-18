import { Metrics } from "@/platform/metrics/ports/metrics";

export class NoopMetrics extends Metrics {
  public count(): void {
    return;
  }

  public observe(): void {
    return;
  }

  public gauge(): void {
    return;
  }
}
