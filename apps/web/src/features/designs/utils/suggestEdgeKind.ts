import { catalogue, type DesignNode, type EdgeKind } from "@repo/design";

const STORES = new Set<DesignNode["kind"]>([
  "sql-database",
  "nosql-database",
  "object-storage",
]);

export const suggestEdgeKind = (from: DesignNode, to: DesignNode): EdgeKind => {
  if (from.kind === to.kind && catalogue[from.kind].replicable) {
    return "replication";
  }

  if (from.kind === "queue" || to.kind === "queue") return "async-message";
  if (to.kind === "cache") return "read";
  if (STORES.has(to.kind)) return "write";

  return "sync-call";
};
