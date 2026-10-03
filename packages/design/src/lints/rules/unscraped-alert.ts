import { defineLint } from "../define-lint";
import { labelOf } from "../walk";

export const unscrapedAlert = defineLint({
  id: "unscraped-alert",
  title: "Alerts that can never fire",
  severity: "warning",
  run: (graph) =>
    graph.edges.flatMap((watch) => {
      if (watch.kind !== "watches") return [];

      const scraped = graph.edges.some(
        (edge) => edge.kind === "scrapes" && edge.to === watch.to,
      );

      if (scraped) return [];

      const alert = graph.nodes.find((node) => node.id === watch.from);
      const target = graph.nodes.find((node) => node.id === watch.to);

      if (!alert || !target) return [];

      return [
        {
          message: `${labelOf(alert)} watches ${labelOf(target)}, but nothing scrapes ${labelOf(target)}'s metrics, so it can never fire. Point a monitoring system at it.`,
          nodeIds: [alert.id, target.id],
          edgeIds: [watch.id],
        },
      ];
    }),
});
