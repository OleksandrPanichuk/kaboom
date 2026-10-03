import type { DesignGraph, DesignNode } from "../../graph";
import { defineLint } from "../define-lint";
import { labelOf, onRequestPath } from "../walk";

const replicated = (graph: DesignGraph, id: string): boolean =>
  graph.edges.some(
    (edge) =>
      edge.kind === "replication" && (edge.from === id || edge.to === id),
  );

const podsAtStart = (
  graph: DesignGraph,
  node: Extract<DesignNode, { kind: "k8s-deployment" }>,
): number => {
  const edge = graph.edges.find(
    (candidate) => candidate.kind === "scales" && candidate.to === node.id,
  );
  const scaler = graph.nodes.find((item) => item.id === edge?.from);

  return scaler?.kind === "hpa"
    ? Math.min(
        scaler.props.max,
        Math.max(scaler.props.min, node.props.replicas),
      )
    : node.props.replicas;
};

const singleInstance = (graph: DesignGraph, node: DesignNode): boolean => {
  if (node.kind === "k8s-deployment") {
    return podsAtStart(graph, node) < 2;
  }

  if (node.kind !== "service" && node.kind !== "worker") return false;

  const { replicas, autoscale } = node.props;

  return replicas < 2 && !(autoscale.enabled && autoscale.min >= 2);
};

const why = (graph: DesignGraph, node: DesignNode): string | null => {
  if (singleInstance(graph, node)) {
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

  if (node.kind === "coordination" && node.props.members < 3) {
    return `${labelOf(node)} has ${node.props.members === 1 ? "one member" : "two members"}; it needs a majority up, so losing one stops every lock.`;
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

    for (const edge of graph.edges) {
      if (edge.kind === "lock" && path.has(edge.from)) path.add(edge.to);
    }

    return graph.nodes.flatMap((node) => {
      const message = path.has(node.id) ? why(graph, node) : null;

      return message ? [{ message, nodeIds: [node.id], edgeIds: [] }] : [];
    });
  },
});
