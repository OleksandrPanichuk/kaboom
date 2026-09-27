import type { DesignGraph } from "../../graph";
import { defineLint } from "../define-lint";
import { labelOf } from "../walk";

const SYNCHRONOUS = new Set(["sync-call", "read", "write"]);
const WRITES = new Set(["sync-call", "write"]);
const FAN_OUT = 10;

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

export const syncFanOut = defineLint({
  id: "sync-fan-out",
  title: "Fan-out while the user waits",
  severity: "warning",
  run: (graph) => {
    const path = waitedOn(graph);

    return graph.edges.flatMap((edge) => {
      if (
        !WRITES.has(edge.kind) ||
        edge.props.fanOut < FAN_OUT ||
        !path.has(edge.from)
      ) {
        return [];
      }

      const source = graph.nodes.find((node) => node.id === edge.from);
      const target = graph.nodes.find((node) => node.id === edge.to);

      if (!source || !target) return [];

      return [
        {
          message: `${labelOf(source)} makes ${edge.props.fanOut} writes to ${labelOf(target)} for every request while the user waits. Hand the fan-out to a queue or a stream and let workers do it.`,
          nodeIds: [source.id, target.id],
          edgeIds: [edge.id],
        },
      ];
    });
  },
});
