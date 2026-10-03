import { catalogue, type DesignNode, type EdgeKind } from "@repo/design";

const STORES = new Set<DesignNode["kind"]>([
  "sql-database",
  "nosql-database",
  "object-storage",
]);

const DATABASES = new Set<DesignNode["kind"]>([
  "sql-database",
  "nosql-database",
]);

const MESSAGING = new Set<DesignNode["kind"]>(["queue", "stream"]);

const MOUNTABLE = new Set<DesignNode["kind"]>(["config-map", "secret"]);

const candidates = (from: DesignNode, to: DesignNode): EdgeKind[] => {
  if (from.kind === "pipeline-stage") {
    return to.kind === "artifact-registry" ? ["publishes"] : ["pipeline-next"];
  }
  if (from.kind === "hpa") return ["scales"];
  if (from.kind === "alert") return ["watches"];
  if (MOUNTABLE.has(to.kind)) return ["mounts"];

  if (from.kind === to.kind && catalogue[from.kind].replicable) {
    return ["replication", "write", "read"];
  }

  if (to.kind === "coordination") return ["lock"];
  if (DATABASES.has(from.kind)) return ["change-feed"];

  if (MESSAGING.has(from.kind) || MESSAGING.has(to.kind)) {
    return ["async-message"];
  }
  if (to.kind === "cache") return ["read", "write"];
  if (to.kind === "search-index") return ["read", "write"];
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
