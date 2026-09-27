import { defineLint } from "../define-lint";
import { labelOf, outgoing } from "../walk";

export const statefulBehindRoundRobin = defineLint({
  id: "stateful-behind-round-robin",
  title: "Stateful service behind a balancer",
  severity: "warning",
  run: (graph) =>
    graph.nodes.flatMap((balancer) => {
      if (
        balancer.kind !== "load-balancer" ||
        balancer.props.algorithm === "ip-hash"
      ) {
        return [];
      }

      return outgoing(graph, balancer.id, true).flatMap((edge) => {
        const target = graph.nodes.find((node) => node.id === edge.to);

        if (target?.kind !== "service" || target.props.stateless) return [];

        return [
          {
            message: `${labelOf(balancer)} spreads requests over ${labelOf(target)}, which keeps state per replica; a user's next request can land on a replica that does not know them. Use ip-hash, or move the state out of the service.`,
            nodeIds: [balancer.id, target.id],
            edgeIds: [edge.id],
          },
        ];
      });
    }),
});
