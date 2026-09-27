import { catalogue, type DesignNode, type EdgeKind } from "@repo/design";

const STORES = new Set<DesignNode["kind"]>([
  "sql-database",
  "nosql-database",
  "object-storage",
]);

const candidates = (from: DesignNode, to: DesignNode): EdgeKind[] => {
  if (from.kind === to.kind && catalogue[from.kind].replicable) {
    return ["replication", "write", "read"];
  }

  if (from.kind === "queue" || to.kind === "queue") return ["async-message"];
  if (to.kind === "cache") return ["read", "write"];
  if (STORES.has(to.kind)) return ["write", "read"];

  return ["sync-call", "async-message"];
};

export const suggestEdgeKind = (
  from: DesignNode,
  to: DesignNode,
  taken: readonly EdgeKind[] = [],
): EdgeKind => {
  const options = candidates(from, to);

  return options.find((kind) => !taken.includes(kind)) ?? options[0]!;
};
