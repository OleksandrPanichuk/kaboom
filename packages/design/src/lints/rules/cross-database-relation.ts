import { relationsOf, tableName } from "../../data-model";
import { defineLint } from "../define-lint";

export const crossDatabaseRelation = defineLint({
  id: "cross-database-relation",
  title: "Foreign key across databases",
  severity: "warning",
  run: (graph) => {
    const databaseOf = (groupId: string | null) =>
      graph.groups.find(
        (group) => group.id === groupId && group.kind === "database",
      )?.id ?? null;

    return relationsOf(graph)
      .filter(
        ({ from, to }) => databaseOf(from.groupId) !== databaseOf(to.groupId),
      )
      .map(({ edge, from, to }) => ({
        message: `${tableName(from)} and ${tableName(to)} are in different databases, so no foreign key can join them; put them in one database or keep the reference as a plain column.`,
        nodeIds: [from.id, to.id],
        edgeIds: [edge.id],
      }));
  },
});
