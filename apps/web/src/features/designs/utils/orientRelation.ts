import type { DesignNode, Relation } from "@repo/design";

type Table = Extract<DesignNode, { kind: "table" }>;

export interface OrientedRelation {
  from: string;
  to: string;
  relation: Relation;
}

const isKey = (table: Table, columnId: string): boolean => {
  const column = table.props.columns.find((item) => item.id === columnId);
  const key = table.props.columns.filter((item) => item.primaryKey);

  return (
    column !== undefined &&
    (column.unique || (key.length === 1 && key[0]!.id === column.id))
  );
};

export const orientRelation = (
  from: Table,
  fromColumn: string,
  to: Table,
  toColumn: string,
): OrientedRelation => {
  const swap = !isKey(to, toColumn) && isKey(from, fromColumn);

  return swap
    ? {
        from: to.id,
        to: from.id,
        relation: {
          fromColumn: toColumn,
          toColumn: fromColumn,
          onDelete: "restrict",
        },
      }
    : {
        from: from.id,
        to: to.id,
        relation: { fromColumn, toColumn, onDelete: "restrict" },
      };
};
