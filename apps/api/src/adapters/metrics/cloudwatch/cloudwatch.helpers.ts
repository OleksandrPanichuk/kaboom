import type { MetricDatum, StandardUnit } from "@aws-sdk/client-cloudwatch";

import type { Aggregate, Dimensions } from "./cloudwatch.typedefs";

export const unitOf = (unit: string): StandardUnit =>
  unit === "ms" ? "Milliseconds" : unit === "s" ? "Seconds" : "Count";

export const aggregateKey = (name: string, dimensions: Dimensions): string =>
  `${name}|${JSON.stringify(Object.entries(dimensions))}`;

export const toDatum = (
  aggregate: Aggregate,
  timestamp: Date,
): MetricDatum => ({
  MetricName: aggregate.name,
  Unit: aggregate.unit,
  Timestamp: timestamp,
  Dimensions: Object.entries(aggregate.dimensions).map(([name, value]) => ({
    Name: name,
    Value: value,
  })),
  StatisticValues: {
    SampleCount: aggregate.count,
    Sum: aggregate.sum,
    Minimum: aggregate.min,
    Maximum: aggregate.max,
  },
});

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};
