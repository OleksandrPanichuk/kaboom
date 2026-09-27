import type { DesignGraph } from "../../graph";
import { defineLint } from "../define-lint";
import { labelOf } from "../walk";

const SYNCHRONOUS = new Set(["sync-call", "read", "write"]);

const waitedOn = (graph: DesignGraph): Set<string> => {
  const seen = new Set<string>();
  const stack = graph.nodes
    .filter((node) => node.kind === "client")
    .map((node) => node.id);

  while (stack.length > 0) {
    const id = stack.pop()!;

    if (seen.has(id)) continue;

    seen.add(id);

    for (const edge of graph.edges) {
      if (edge.from === id && SYNCHRONOUS.has(edge.kind)) stack.push(edge.to);
    }
  }

  return seen;
};

export const syncThirdParty = defineLint({
  id: "sync-third-party",
  title: "Third party on the request path",
  severity: "warning",
  run: (graph) => {
    const path = waitedOn(graph);
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));

    return graph.edges.flatMap((edge) => {
      const target = byId.get(edge.to);
      const source = byId.get(edge.from);

      if (
        !target ||
        !source ||
        target.kind !== "external-api" ||
        !SYNCHRONOUS.has(edge.kind) ||
        !path.has(source.id)
      ) {
        return [];
      }

      return [
        {
          message: `${labelOf(source)} waits on ${labelOf(target)} while the user does, so its outages and slow answers become theirs. Put a queue and a worker in front of it.`,
          nodeIds: [source.id, target.id],
          edgeIds: [edge.id],
        },
      ];
    });
  },
});
