import { carriesLoad } from "../catalogue";
import type { DesignEdge, DesignGraph, DesignNode } from "../graph";

export const labelOf = (node: DesignNode): string => node.label || node.kind;

export const outgoing = (
  graph: DesignGraph,
  id: string,
  loadOnly = false,
): DesignEdge[] =>
  graph.edges.filter(
    (edge) => edge.from === id && (!loadOnly || carriesLoad(edge.kind)),
  );

export const entries = (graph: DesignGraph): DesignNode[] =>
  graph.nodes.filter(
    (node) => node.kind === "client" || node.kind === "scheduler",
  );

export const reachable = (
  graph: DesignGraph,
  from: string[],
  loadOnly: boolean,
): Set<string> => {
  const seen = new Set<string>();
  const stack = [...from];

  while (stack.length > 0) {
    const id = stack.pop()!;

    if (seen.has(id)) continue;

    seen.add(id);

    for (const edge of outgoing(graph, id, loadOnly)) stack.push(edge.to);
  }

  return seen;
};

export const onRequestPath = (graph: DesignGraph): Set<string> => {
  const clients = entries(graph);

  return clients.length === 0
    ? new Set(graph.nodes.map((node) => node.id))
    : reachable(
        graph,
        clients.map((node) => node.id),
        true,
      );
};
