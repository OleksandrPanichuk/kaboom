import type {
  Column,
  DocumentField,
  DocumentIndex,
  OnDeleteAction,
  TableIndex,
} from "../catalogue";
import { createEdge, createNode, type DesignEdge } from "../graph";
import type { CollectionNode } from "./documents";
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

export const field = (
  name: string,
  type: DocumentField["type"],
  extra: Partial<DocumentField> = {},
): DocumentField => ({ id: name, name, type, required: false, ...extra });

export const collection = (
  id: string,
  fields: DocumentField[],
  indexes: DocumentIndex[] = [],
  groupId = "store",
): CollectionNode => {
  const node = createNode("collection", { id, label: id, groupId });

  node.props.fields = fields;
  node.props.indexes = indexes;

  return node;
};

export const refers = (from: string, path: string[], to: string): DesignEdge =>
  createEdge({
    id: `${from}.${path.join(".")}`,
    from,
    to,
    kind: "reference",
    reference: { fromField: path },
  });
