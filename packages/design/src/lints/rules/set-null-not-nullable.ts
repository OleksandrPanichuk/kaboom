import { columnName, relationsOf } from "../../data-model";
import { defineLint } from "../define-lint";

export const setNullNotNullable = defineLint({
  id: "set-null-not-nullable",
  title: "Set null on a required column",
  severity: "warning",
  run: (graph) =>
    relationsOf(graph).flatMap(({ edge, relation, from, to, pairs }) => {
      if (relation.onDelete !== "set-null") return [];

      const required = pairs.filter((pair) => !pair.from.nullable);

      return required.length === 0
        ? []
        : [
            {
              message: `Deleting a row of ${to.label || to.id} sets ${required.map((pair) => columnName(from, pair.from)).join(" and ")} to null, but ${required.length === 1 ? "it cannot" : "they cannot"} be null; make ${required.length === 1 ? "it" : "them"} nullable or choose another rule.`,
              nodeIds: [from.id],
              edgeIds: [edge.id],
            },
          ];
    }),
});
