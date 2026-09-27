import { catalogue, type DesignNode, type EdgeKind } from "@repo/design";

const STORES = new Set<DesignNode["kind"]>([
  "sql-database",
  "nosql-database",
  "object-storage",
]);

const MESSAGING = new Set<DesignNode["kind"]>(["queue", "stream"]);

const candidates = (from: DesignNode, to: DesignNode): EdgeKind[] => {
  if (from.kind === to.kind && catalogue[from.kind].replicable) {
    return ["replication", "write", "read"];
  }

  if (MESSAGING.has(from.kind) || MESSAGING.has(to.kind)) {
    return ["async-message"];
  }
  if (to.kind === "cache") return ["read", "write"];
  if (STORES.has(to.kind)) return ["write", "read"];

  return ["sync-call"];
};

export const suggestEdgeKind = (
  from: DesignNode,
  to: DesignNode,
  taken: readonly EdgeKind[] = [],
): EdgeKind => {
  const options = candidates(from, to);

  return options.find((kind) => !taken.includes(kind)) ?? options[0]!;
};
