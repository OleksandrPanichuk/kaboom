import { columnName, indexedBy, relationsOf } from "../../data-model";
import { defineLint } from "../define-lint";

export const unindexedForeignKey = defineLint({
  id: "unindexed-foreign-key",
  title: "Unindexed foreign key",
  severity: "info",
  run: (graph) =>
    relationsOf(graph)
      .filter(({ from, foreignKey }) => !indexedBy(from, [foreignKey.id]))
      .map(({ edge, from, to, foreignKey }) => ({
        message: `No index leads with ${columnName(from, foreignKey)}, so finding the rows of a ${to.label || to.id}, or deleting one, reads all of ${from.label || from.id}.`,
        nodeIds: [from.id],
        edgeIds: [edge.id],
      })),
});
