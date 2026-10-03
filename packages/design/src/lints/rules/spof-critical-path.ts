import type { DesignGraph, DesignNode } from "../../graph";
import { defineLint } from "../define-lint";
import { labelOf, onRequestPath } from "../walk";

const replicated = (graph: DesignGraph, id: string): boolean =>
  graph.edges.some(
    (edge) =>
      edge.kind === "replication" && (edge.from === id || edge.to === id),
  );

const autoscalerFloor = (graph: DesignGraph, id: string): number => {
  const edge = graph.edges.find(
    (candidate) => candidate.kind === "scales" && candidate.to === id,
  );
  const scaler = graph.nodes.find((node) => node.id === edge?.from);

  return scaler?.kind === "hpa" ? scaler.props.min : 0;
};

const singleInstance = (graph: DesignGraph, node: DesignNode): boolean => {
  if (node.kind === "k8s-deployment") {
    return Math.max(node.props.replicas, autoscalerFloor(graph, node.id)) < 2;
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
