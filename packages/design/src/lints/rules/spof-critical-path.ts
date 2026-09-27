import type { DesignGraph, DesignNode } from "../../graph";
import { defineLint } from "../define-lint";
import { labelOf, onRequestPath } from "../walk";

const replicated = (graph: DesignGraph, id: string): boolean =>
  graph.edges.some(
    (edge) =>
      edge.kind === "replication" && (edge.from === id || edge.to === id),
  );

const singleInstance = (node: DesignNode): boolean => {
  if (node.kind !== "service" && node.kind !== "worker") return false;

  const { replicas, autoscale } = node.props;

  return replicas < 2 && !(autoscale.enabled && autoscale.min >= 2);
};

const why = (graph: DesignGraph, node: DesignNode): string | null => {
  if (singleInstance(node)) {
    return `${labelOf(node)} runs a single replica; when it fails, everything behind it stops.`;
  }

  if (node.kind === "sql-database" && !replicated(graph, node.id)) {
    return `${labelOf(node)} has no replica; when it fails, its data is unreachable until it is restored.`;
  }

  if (
    node.kind === "nosql-database" &&
    node.props.replicationFactor < 2 &&
    !replicated(graph, node.id)
  ) {
    return `${labelOf(node)} keeps one copy of its data; losing a node loses the partitions on it.`;
  }

  if (node.kind === "stream" && node.props.replicationFactor < 2) {
    return `${labelOf(node)} keeps one copy of each partition; losing a broker loses the messages on it.`;
  }

  return null;
};

export const spofCriticalPath = defineLint({
  id: "spof-critical-path",
  title: "Single point of failure",
  severity: "warning",
  run: (graph) => {
    const path = onRequestPath(graph);

    return graph.nodes.flatMap((node) => {
      const message = path.has(node.id) ? why(graph, node) : null;

      return message ? [{ message, nodeIds: [node.id], edgeIds: [] }] : [];
    });
  },
});
