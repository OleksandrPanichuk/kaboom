import { columnName, relationsOf } from "../../data-model";
import { defineLint } from "../define-lint";

export const fkTypeMismatch = defineLint({
  id: "fk-type-mismatch",
  title: "Foreign key of another type",
  severity: "warning",
  run: (graph) =>
    relationsOf(graph).flatMap(({ edge, from, to, pairs }) =>
      pairs
        .filter((pair) => pair.from.type !== pair.to.type)
        .map((pair) => ({
          message: `${columnName(from, pair.from)} is ${pair.from.type} but references ${columnName(to, pair.to)}, a ${pair.to.type}; give them one type.`,
          nodeIds: [from.id, to.id],
          edgeIds: [edge.id],
        })),
    ),
});
