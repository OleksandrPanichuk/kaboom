import type { NodeKind } from "../../catalogue";
import { defineLint } from "../define-lint";
import { labelOf, outgoing } from "../walk";

const NEEDS_A_TARGET: Partial<Record<NodeKind, (label: string) => string>> = {
  client: (label) =>
    `${label} calls nothing; connect it to where its requests go.`,
  cdn: (label) => `${label} has no origin to fetch a miss from.`,
  "load-balancer": (label) =>
    `${label} has no targets to spread requests over.`,
  queue: (label) => `${label} has no consumer; its messages pile up.`,
};

export const deadEndNode = defineLint({
  id: "dead-end-node",
  title: "Dead end",
  severity: "info",
  run: (graph) =>
    graph.nodes.flatMap((node) => {
      const explain = NEEDS_A_TARGET[node.kind];

      if (!explain || outgoing(graph, node.id, true).length > 0) return [];

      return [
        { message: explain(labelOf(node)), nodeIds: [node.id], edgeIds: [] },
      ];
    }),
});
