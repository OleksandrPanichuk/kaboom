import { defineLint } from "../define-lint";
import { labelOf } from "../walk";

export const duplicateSchedule = defineLint({
  id: "duplicate-schedule",
  title: "Jobs that run twice",
  severity: "warning",
  run: (graph) =>
    graph.nodes.flatMap((node) => {
      if (node.kind !== "scheduler" || node.props.replicas < 2) return [];

      const locked = graph.edges.some(
        (edge) => edge.from === node.id && edge.kind === "lock",
      );

      if (locked) return [];

      return [
        {
          message: `${labelOf(node)} runs ${node.props.replicas} replicas and each fires the schedule, so every job runs ${node.props.replicas} times. Take a lock on a coordination service, or run one replica.`,
          nodeIds: [node.id],
          edgeIds: [],
        },
      ];
    }),
});
