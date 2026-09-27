import type { NodeKind } from "@repo/design";

export interface PaletteGroup {
  label: string;
  kinds: NodeKind[];
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  { label: "Entry", kinds: ["client", "cdn", "load-balancer"] },
  { label: "Compute", kinds: ["service", "worker"] },
  {
    label: "Data",
    kinds: ["cache", "sql-database", "nosql-database", "object-storage"],
  },
  { label: "Messaging", kinds: ["queue"] },
];
