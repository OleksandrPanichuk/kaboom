import {
  collectionName,
  referencesOf,
  relationsOf,
  tableName,
} from "../../data-model";
import { defineLint } from "../define-lint";

export const crossDatabaseRelation = defineLint({
  id: "cross-database-relation",
  title: "Reference across databases",
  severity: "warning",
  run: (graph) => {
    const databaseOf = (groupId: string | null) =>
      graph.groups.find(
        (group) => group.id === groupId && group.kind === "database",
      )?.id ?? null;
    const apart = (
      from: { groupId: string | null },
      to: { groupId: string | null },
    ) => databaseOf(from.groupId) !== databaseOf(to.groupId);

    return [
      ...relationsOf(graph)
        .filter(({ from, to }) => apart(from, to))
        .map(({ edge, from, to }) => ({
          message: `${tableName(from)} and ${tableName(to)} are in different databases, so no foreign key can join them; put them in one database or keep the reference as a plain column.`,
          nodeIds: [from.id, to.id],
          edgeIds: [edge.id],
        })),
      ...referencesOf(graph)
        .filter(({ from, to }) => apart(from, to))
        .map(({ edge, from, to }) => ({
          message: `${collectionName(from)} and ${collectionName(to)} are in different databases, so a lookup cannot join them; put them in one database.`,
          nodeIds: [from.id, to.id],
          edgeIds: [edge.id],
        })),
    ];
  },
});
