import type { DesignGraph, DesignGroup, DesignNode } from "@repo/design";

export const labelIn = (graph: DesignGraph, id: string): string =>
  graph.nodes.find((node) => node.id === id)?.label ?? id;

export const groupsWithin = (graph: DesignGraph, groupId: string): string[] => [
  groupId,
  ...graph.groups
    .filter((group) => group.parentId === groupId)
    .flatMap((group) => groupsWithin(graph, group.id)),
];

export const nodesWithin = (
  graph: DesignGraph,
  groupId: string,
): DesignNode[] => {
  const inside = new Set(groupsWithin(graph, groupId));

  return graph.nodes.filter(
    (node) => node.groupId !== null && inside.has(node.groupId),
  );
};

export const hostsFor = (
  graph: DesignGraph,
  group: DesignGroup,
): Array<{ id: string; label: string }> => {
  const kind =
    group.engine === "mongodb" || group.engine === "dynamodb"
      ? "nosql-database"
      : "sql-database";

  return graph.nodes
    .filter((node) => node.kind === kind)
    .map((node) => ({ id: node.id, label: labelIn(graph, node.id) }));
};

export const replicaLabels = (graph: DesignGraph, nodeId: string): string[] =>
  graph.edges
    .filter((edge) => edge.kind === "replication" && edge.from === nodeId)
    .map((edge) => labelIn(graph, edge.to));

export const sharedGroupId = (nodes: readonly DesignNode[]): string | null =>
  nodes.every((node) => node.groupId === nodes[0]?.groupId)
    ? (nodes[0]?.groupId ?? null)
    : null;
