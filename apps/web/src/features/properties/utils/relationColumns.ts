import { type DesignGraph, isOneToOne, relationsOf } from "@repo/design";

export interface RelationColumns {
  from: string;
  to: string;
  oneToOne: boolean;
}

export const relationColumns = (
  graph: DesignGraph,
  edgeId: string,
): RelationColumns | null => {
  const relation = relationsOf(graph).find((item) => item.edge.id === edgeId);

  return relation
    ? {
        from: relation.foreignKey.name,
        to: relation.referenced.name,
        oneToOne: isOneToOne(relation),
      }
    : null;
};
