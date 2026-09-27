import type { DesignGraph, DesignNode } from "../../graph";
import { defineLint } from "../define-lint";
import { labelOf } from "../walk";

const WRITES = new Set(["write", "sync-call"]);

const writesTo = (graph: DesignGraph, node: DesignNode, kinds: string[]) =>
  graph.edges.filter(
    (edge) =>
      edge.from === node.id &&
      WRITES.has(edge.kind) &&
      kinds.includes(
        graph.nodes.find((target) => target.id === edge.to)?.kind ?? "",
      ),
  );

export const dualWrite = defineLint({
  id: "dual-write",
  title: "Writes to two stores",
  severity: "warning",
  run: (graph) =>
    graph.nodes.flatMap((node) => {
      if (node.kind !== "service") return [];

      const databases = writesTo(graph, node, [
        "sql-database",
        "nosql-database",
      ]);
      const indexes = writesTo(graph, node, ["search-index"]);

      if (databases.length === 0 || indexes.length === 0) return [];

      const database = graph.nodes.find(
        (item) => item.id === databases[0]!.to,
      )!;
      const index = graph.nodes.find((item) => item.id === indexes[0]!.to)!;

      return [
        {
          message: `${labelOf(node)} writes to ${labelOf(database)} and to ${labelOf(index)} itself, so when one write fails the two disagree. Feed ${labelOf(index)} from the change feed of ${labelOf(database)}.`,
          nodeIds: [node.id, database.id, index.id],
          edgeIds: [databases[0]!.id, indexes[0]!.id],
        },
      ];
    }),
});
