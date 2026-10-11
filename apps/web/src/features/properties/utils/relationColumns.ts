import {
  type Column,
  type DesignEdge,
  type DesignGraph,
  type DesignOp,
  isOneToOne,
  relationsOf,
} from "@repo/design";

export interface RelationPair {
  fromId: string;
  toId: string;
  from: string;
  to: string;
}

export interface RelationColumns {
  from: string;
  to: string;
  oneToOne: boolean;
  optional: boolean;
  pairs: RelationPair[];
  spareFrom: Column[];
  spareTo: Column[];
}

export const relationColumns = (
  graph: DesignGraph,
  edgeId: string,
): RelationColumns | null => {
  const relation = relationsOf(graph).find((item) => item.edge.id === edgeId);

  if (!relation) return null;

  const pairs = relation.pairs.map((pair) => ({
    fromId: pair.from.id,
    toId: pair.to.id,
    from: pair.from.name,
    to: pair.to.name,
  }));

  return {
    from: pairs.map((pair) => pair.from).join(", "),
    to: pairs.map((pair) => pair.to).join(", "),
    oneToOne: isOneToOne(relation),
    optional: relation.pairs.some((pair) => pair.from.nullable),
    pairs,
    spareFrom: relation.from.props.columns.filter(
      (column) => !pairs.some((pair) => pair.fromId === column.id),
    ),
    spareTo: relation.to.props.columns.filter(
      (column) => !pairs.some((pair) => pair.toId === column.id),
    ),
  };
};

export const withPairs = (
  edge: DesignEdge,
  pairs: ReadonlyArray<{ fromColumn: string; toColumn: string }>,
): DesignOp[] => {
  const [first, ...rest] = pairs;

  if (!edge.relation || !first) return [];

  const { moreColumns: _, ...relation } = edge.relation;

  return [
    { op: "remove-edge", id: edge.id },
    {
      op: "add-edge",
      edge: {
        ...edge,
        relation: {
          ...relation,
          fromColumn: first.fromColumn,
          toColumn: first.toColumn,
          ...(rest.length > 0 ? { moreColumns: rest } : {}),
        },
      },
    },
  ];
};
