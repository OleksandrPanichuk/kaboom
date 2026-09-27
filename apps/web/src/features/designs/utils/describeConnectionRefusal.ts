import type { DesignGraph, OpRejection } from "@repo/design";

export const describeConnectionRefusal = (
  graph: DesignGraph,
  from: string,
  to: string,
  rejection: OpRejection,
): string => {
  const label = (id: string) =>
    graph.nodes.find((node) => node.id === id)?.label ?? "that node";

  switch (rejection.reason) {
    case "load-cycle":
      return `${label(to)} already sends load on to ${label(from)}, so this connection would make a loop.`;
    case "invalid-edge":
      if (from === to) return "A node cannot connect to itself.";

      if (rejection.message.includes("already exists")) {
        return `${label(from)} is already connected to ${label(to)} this way.`;
      }

      return rejection.message.includes("replicates")
        ? "Replication joins two stores of the same kind, such as two SQL databases."
        : rejection.message;
    case "unknown-node":
      return "One of those nodes is no longer in the design.";
    default:
      return rejection.message;
  }
};
