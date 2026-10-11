import {
  engineIssues,
  engineOf,
  isSqlEngine,
  tablesOf,
} from "../../data-model";
import { defineLint } from "../define-lint";

export const engineUnsupported = defineLint({
  id: "engine-unsupported",
  title: "Not in this engine",
  severity: "warning",
  run: (graph) =>
    tablesOf(graph).flatMap((table) => {
      const engine = engineOf(graph, table);

      if (!isSqlEngine(engine)) return [];

      return table.props.columns.flatMap((column) =>
        engineIssues(engine, table, column).map((message) => ({
          message,
          nodeIds: [table.id],
          edgeIds: [],
        })),
      );
    }),
});
