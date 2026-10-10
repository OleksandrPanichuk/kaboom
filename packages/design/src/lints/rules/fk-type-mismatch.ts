import { columnName, relationsOf } from "../../data-model";
import { defineLint } from "../define-lint";

export const fkTypeMismatch = defineLint({
  id: "fk-type-mismatch",
  title: "Foreign key of another type",
  severity: "warning",
  run: (graph) =>
    relationsOf(graph)
      .filter(
        ({ foreignKey, referenced }) => foreignKey.type !== referenced.type,
      )
      .map(({ edge, from, to, foreignKey, referenced }) => ({
        message: `${columnName(from, foreignKey)} is ${foreignKey.type} but references ${columnName(to, referenced)}, a ${referenced.type}; give them one type.`,
        nodeIds: [from.id, to.id],
        edgeIds: [edge.id],
      })),
});
