import type { DesignGraph, DesignOp } from "@repo/design";

export const removalOps = (
  graph: DesignGraph,
  nodeIds: string[],
  edgeIds: string[],
): DesignOp[] => {
  const nodes = new Set(nodeIds);
  const edges = graph.edges.filter(
    (edge) =>
      edgeIds.includes(edge.id) && !nodes.has(edge.from) && !nodes.has(edge.to),
  );

  return [
    ...edges.map((edge): DesignOp => ({ op: "remove-edge", id: edge.id })),
    ...graph.nodes
      .filter((node) => nodes.has(node.id))
      .map((node): DesignOp => ({ op: "remove-node", id: node.id })),
  ];
};
