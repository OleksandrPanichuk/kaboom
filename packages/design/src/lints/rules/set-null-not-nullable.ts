import { columnName, relationsOf } from "../../data-model";
import { defineLint } from "../define-lint";

export const setNullNotNullable = defineLint({
  id: "set-null-not-nullable",
  title: "Set null on a required column",
  severity: "warning",
  run: (graph) =>
    relationsOf(graph)
      .filter(
        ({ relation, foreignKey }) =>
          relation.onDelete === "set-null" && !foreignKey.nullable,
      )
      .map(({ edge, from, to, foreignKey }) => ({
        message: `Deleting a row of ${to.label || to.id} sets ${columnName(from, foreignKey)} to null, but it cannot be null; make it nullable or choose another rule.`,
        nodeIds: [from.id],
        edgeIds: [edge.id],
      })),
});
