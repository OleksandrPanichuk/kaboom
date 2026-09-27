import type { NodeKind } from "@repo/design";

export interface PaletteGroup {
  label: string;
  kinds: NodeKind[];
}

export const PALETTE_GROUPS: PaletteGroup[] = [
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
      "nosql-database",
      "object-storage",
      "search-index",
    ],
  },
  { label: "Messaging", kinds: ["queue", "stream"] },
  { label: "Coordination", kinds: ["coordination"] },
  { label: "Third party", kinds: ["external-api"] },
];
