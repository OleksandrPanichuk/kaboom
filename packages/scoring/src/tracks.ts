import type { NodeKind, Track } from "@repo/design";

import type { InterviewDimension } from "./schema";

export interface PaletteSection {
  label: string;
  kinds: readonly NodeKind[];
}

export interface TrackDefinition {
  noun: string;
  reviewDimensions: readonly InterviewDimension[];
  keepsWrites: boolean;
  palette: readonly PaletteSection[];
}

export const TRACK_DEFINITIONS = {
  "system-design": {
    noun: "system design",
    reviewDimensions: ["design", "scaling", "reliability"],
    keepsWrites: true,
    palette: [
      {
        label: "Entry",
        kinds: [
          "client",
          "dns",
          "cdn",
          "load-balancer",
          "api-gateway",
          "rate-limiter",
        ],
      },
      { label: "Compute", kinds: ["service", "worker", "scheduler"] },
      {
        label: "Data",
        kinds: [
          "cache",
          "sql-database",
          "connection-pooler",
          "nosql-database",
          "object-storage",
          "search-index",
        ],
      },
      { label: "Messaging", kinds: ["queue", "stream"] },
      { label: "Coordination", kinds: ["coordination"] },
      { label: "Third party", kinds: ["external-api"] },
    ],
  },
  devops: {
    noun: "DevOps",
    reviewDimensions: ["design", "delivery", "operability"],
    keepsWrites: false,
    palette: [
      { label: "Traffic", kinds: ["client", "ingress", "k8s-service"] },
      { label: "Workloads", kinds: ["k8s-deployment", "hpa"] },
      {
        label: "Application",
        kinds: ["load-balancer", "service", "cache", "sql-database"],
      },
      { label: "Configuration", kinds: ["config-map", "secret"] },
      { label: "Delivery", kinds: ["pipeline-stage", "artifact-registry"] },
      { label: "Network", kinds: ["security-group", "nat-gateway"] },
      { label: "Operations", kinds: ["monitoring", "alert"] },
    ],
  },
  "data-model": {
    noun: "data modelling",
    reviewDimensions: ["design", "integrity", "query-performance"],
    keepsWrites: false,
    palette: [
      { label: "Schema", kinds: ["table"] },
      { label: "Documents", kinds: ["collection"] },
      { label: "Key-value", kinds: ["dynamo-table"] },
    ],
  },
} as const satisfies Record<Track, TrackDefinition>;

export type ReviewDimension =
  (typeof TRACK_DEFINITIONS)[Track]["reviewDimensions"][number];
