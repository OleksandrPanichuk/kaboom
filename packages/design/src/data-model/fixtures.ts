import type { Column, OnDeleteAction, TableIndex } from "../catalogue";
import { createEdge, createNode, type DesignEdge } from "../graph";
import type { TableNode } from "./tables";

export const column = (
  name: string,
  type: Column["type"],
  flags: Partial<Pick<Column, "nullable" | "primaryKey" | "unique">> = {},
): Column => ({
  id: name,
  name,
  type,
  nullable: false,
  primaryKey: false,
  unique: false,
  ...flags,
});

export const table = (
  id: string,
  columns: Column[],
  indexes: TableIndex[] = [],
): TableNode => {
  const node = createNode("table", { id, label: id });

  node.props.columns = columns;
  node.props.indexes = indexes;

  return node;
};

export const index = (
  id: string,
  columns: string[],
  unique = false,
): TableIndex => ({ id, columns, unique });

export const references = (
  from: string,
  fromColumn: string,
  to: string,
  toColumn = "id",
  onDelete: OnDeleteAction = "restrict",
): DesignEdge =>
  createEdge({
    id: `${from}.${fromColumn}`,
    from,
    to,
    kind: "relation",
    relation: { fromColumn, toColumn, onDelete },
  });
