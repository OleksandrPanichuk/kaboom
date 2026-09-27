import type { DesignGraph, DesignNode } from "../../graph";
import { defineLint } from "../define-lint";
import { labelOf, outgoing } from "../walk";

const regionOf = (graph: DesignGraph, node: DesignNode): string | null => {
  const seen = new Set<string>();
  let current = graph.groups.find((group) => group.id === node.groupId);

  while (current && !seen.has(current.id)) {
    if (current.kind === "region") return current.id;
    seen.add(current.id);
    current = graph.groups.find((group) => group.id === current!.parentId);
  }

  return null;
};

export const failoverNowhere = defineLint({
  id: "failover-nowhere",
  title: "Nowhere to fail over",
  severity: "warning",
  run: (graph) =>
    graph.nodes.flatMap((node) => {
      if (node.kind !== "dns" || node.props.policy !== "failover") return [];

      const targets = outgoing(graph, node.id, true)
        .map((edge) => graph.nodes.find((item) => item.id === edge.to))
        .filter((item): item is DesignNode => item !== undefined);

      if (targets.length === 0) return [];

      const regions = new Set(targets.map((target) => regionOf(graph, target)));
      const single =
        targets.length < 2 || (regions.size === 1 && !regions.has(null));

      if (!single) return [];

      return [
        {
          message:
            targets.length < 2
              ? `${labelOf(node)} fails over, but it sends to one place only; when that fails there is nowhere to go.`
              : `${labelOf(node)} fails over, but everything it sends to is in one region; losing that region leaves nowhere to go.`,
          nodeIds: [node.id, ...targets.map((target) => target.id)],
          edgeIds: [],
        },
      ];
    }),
});
