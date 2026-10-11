import {
  columnsName,
  foreignKeyIds,
  indexedBy,
  relationsOf,
} from "../../data-model";
import { defineLint } from "../define-lint";

export const unindexedForeignKey = defineLint({
  id: "unindexed-foreign-key",
  title: "Unindexed foreign key",
  severity: "info",
  run: (graph) =>
    relationsOf(graph)
      .filter((relation) => !indexedBy(relation.from, foreignKeyIds(relation)))
      .map(({ edge, from, to, pairs }) => ({
        message: `No index leads with ${columnsName(
          from,
          pairs.map((pair) => pair.from),
        )}, so finding the rows of a ${to.label || to.id}, or deleting one, reads all of ${from.label || from.id}.`,
        nodeIds: [from.id],
        edgeIds: [edge.id],
      })),
});
