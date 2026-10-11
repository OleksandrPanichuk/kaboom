import {
  engineIssues,
  engineOf,
  indexIssues,
  isSqlEngine,
  relationIssues,
  relationsOf,
  tablesOf,
} from "../../data-model";
import { defineLint } from "../define-lint";

export const engineUnsupported = defineLint({
  id: "engine-unsupported",
  title: "Not in this engine",
  severity: "warning",
  run: (graph) => [
    ...tablesOf(graph).flatMap((table) => {
      const engine = engineOf(graph, table);

      if (!isSqlEngine(engine)) return [];

      return [
        ...table.props.columns.flatMap((column) =>
          engineIssues(engine, table, column),
        ),
        ...table.props.indexes.flatMap((index) =>
          indexIssues(engine, table, index),
        ),
      ].map((message) => ({ message, nodeIds: [table.id], edgeIds: [] }));
    }),
    ...relationsOf(graph).flatMap((relation) => {
      const engine = engineOf(graph, relation.from);

      return isSqlEngine(engine)
        ? relationIssues(engine, relation).map((message) => ({
            message,
            nodeIds: [relation.from.id],
            edgeIds: [relation.edge.id],
          }))
        : [];
    }),
  ],
});
