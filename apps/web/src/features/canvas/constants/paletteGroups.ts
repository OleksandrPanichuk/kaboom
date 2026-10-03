import type { NodeKind, Track } from "@repo/design";

export interface PaletteGroup {
  track: Track;
  label: string;
  kinds: NodeKind[];
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    track: "system-design",
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
  {
    track: "system-design",
    label: "Compute",
    kinds: ["service", "worker", "scheduler"],
  },
  {
    track: "system-design",
    label: "Data",
    kinds: [
      "cache",
      "sql-database",
      "nosql-database",
      "object-storage",
      "search-index",
    ],
  },
  { track: "system-design", label: "Messaging", kinds: ["queue", "stream"] },
  { track: "system-design", label: "Coordination", kinds: ["coordination"] },
  { track: "system-design", label: "Third party", kinds: ["external-api"] },
  {
    track: "devops",
    label: "Traffic",
    kinds: ["client", "ingress", "k8s-service"],
  },
  { track: "devops", label: "Workloads", kinds: ["k8s-deployment", "hpa"] },
  { track: "devops", label: "Configuration", kinds: ["config-map", "secret"] },
  {
    track: "devops",
    label: "Delivery",
    kinds: ["pipeline-stage", "artifact-registry"],
  },
  {
    track: "devops",
    label: "Network",
    kinds: ["security-group", "nat-gateway"],
  },
  {
    track: "devops",
    label: "Operations",
    kinds: ["monitoring", "alert"],
  },
];
