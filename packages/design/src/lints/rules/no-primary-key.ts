import { primaryKeyOf, tableName, tablesOf } from "../../data-model";
import { defineLint } from "../define-lint";

export const noPrimaryKey = defineLint({
  id: "no-primary-key",
  title: "No primary key",
  severity: "warning",
  run: (graph) =>
    tablesOf(graph)
      .filter((table) => primaryKeyOf(table).length === 0)
      .map((table) => ({
        message: `${tableName(table)} has no primary key, so nothing can reference one of its rows or tell two of them apart.`,
        nodeIds: [table.id],
        edgeIds: [],
      })),
});
