import { catalogue } from "../../catalogue";
import { defineLint } from "../define-lint";
import { entries, labelOf, reachable } from "../walk";

export const unreachableNode = defineLint({
  id: "unreachable-node",
  title: "Unreachable node",
  severity: "info",
  run: (graph) => {
    const clients = entries(graph);

    if (clients.length === 0) return [];

    const seen = reachable(
      graph,
      clients.map((node) => node.id),
      false,
    );

    return graph.nodes
      .filter(
        (node) => catalogue[node.kind].carriesTraffic && !seen.has(node.id),
      )
      .map((node) => ({
        message: `${labelOf(node)} gets no traffic: nothing a client or a scheduler starts leads to it.`,
        nodeIds: [node.id],
        edgeIds: [],
      }));
  },
});
