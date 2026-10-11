import type {
  Column,
  ColumnType,
  DocumentField,
  DocumentIndex,
  DynamoIndex,
  EdgeKind,
  EdgeProps,
  Engine,
  ItemAttribute,
  ItemType,
  KeyAttribute,
  NodeKind,
  OnDeleteAction,
  TableIndex,
} from "../../catalogue";
import {
  createEdge,
  createGroup,
  createNode,
  type DesignEdge,
  type DesignGraph,
  type DesignGroup,
  type DesignNode,
  emptyGraph,
} from "../../graph";

export const node = (
  id: string,
  kind: NodeKind,
  label: string,
  props: Record<string, unknown> = {},
): DesignNode => {
  const created = createNode(kind, { id, label });

  return { ...created, props: { ...created.props, ...props } } as DesignNode;
};

export const edge = (
  from: string,
  to: string,
  kind: EdgeKind,
  props: Partial<EdgeProps> = {},
) => {
  const created = createEdge({ id: `${from}-${to}-${kind}`, from, to, kind });

  return { ...created, props: { ...created.props, ...props } };
};

export const graph = (
  nodes: DesignNode[],
  edges: DesignEdge[] = [],
  groups: DesignGroup[] = [],
): DesignGraph => ({ ...emptyGraph(), nodes, edges, groups });

export const database = (
  id: string,
  label: string,
  engine: Engine,
): DesignGroup => createGroup({ id, kind: "database", label, engine });

export const region = (id: string, label: string): DesignGroup =>
  createGroup({ id, kind: "region", label });

export const vpc = (id: string, label: string): DesignGroup =>
  createGroup({ id, kind: "vpc", label });

export const subnet = (
  id: string,
  kind: "public-subnet" | "private-subnet",
  label: string,
  parentId: string,
): DesignGroup => createGroup({ id, kind, label, parentId });

export const within = (groupId: string, placed: DesignNode): DesignNode => ({
  ...placed,
  groupId,
});

type ColumnFlag = "key" | "unique" | "null";

export const column = (
  name: string,
  type: ColumnType,
  ...flags: ColumnFlag[]
): Column => ({
  id: name,
  name,
  type,
  nullable: flags.includes("null"),
  primaryKey: flags.includes("key"),
  unique: flags.includes("unique"),
});

export const id = (): Column => column("id", "bigint", "key");

export const index = (
  columns: string[],
  unique = false,
): { id: string; columns: string[]; unique: boolean } => ({
  id: `${columns.join("_")}${unique ? "_unique" : ""}_idx`,
  columns,
  unique,
});

export const table = (
  tableId: string,
  columns: Column[],
  indexes: TableIndex[] = [],
): DesignNode => node(tableId, "table", tableId, { columns, indexes });

export const references = (
  from: string,
  fromColumn: string,
  to: string,
  onDelete: OnDeleteAction = "restrict",
  toColumn = "id",
): DesignEdge => ({
  ...createEdge({ id: `${from}-${fromColumn}-fk`, from, to, kind: "relation" }),
  relation: { fromColumn, toColumn, onDelete },
});

export const field = (
  name: string,
  type: DocumentField["type"],
  extra: Partial<Omit<DocumentField, "id" | "name" | "type">> = {},
): DocumentField => ({ id: name, name, type, required: false, ...extra });

export const collection = (
  collectionId: string,
  groupId: string,
  fields: DocumentField[] = [],
  indexes: DocumentIndex[] = [],
): DesignNode =>
  within(
    groupId,
    node(collectionId, "collection", collectionId, { fields, indexes }),
  );

export const refers = (
  from: string,
  path: string[],
  to: string,
): DesignEdge => ({
  ...createEdge({
    id: `${from}-${path.join("-")}-ref`,
    from,
    to,
    kind: "reference",
  }),
  reference: { fromField: path },
});

export const keyAttribute = (
  name: string,
  type: KeyAttribute["type"] = "S",
): KeyAttribute => ({ id: name, name, type });

export const attribute = (
  name: string,
  type: ItemAttribute["type"] = "S",
  extra: Partial<Omit<ItemAttribute, "id" | "name" | "type">> = {},
): ItemAttribute => ({ id: name, name, type, ...extra });

export const itemType = (
  name: string,
  attributes: ItemAttribute[],
  keys: Record<string, string> = {},
): ItemType => ({ id: name, name, attributes, keys });

export const globalIndex = (
  name: string,
  partitionKey: string,
  sortKey: string | null,
  projection: Pick<DynamoIndex, "projection" | "include"> = {
    projection: "all",
  },
): DynamoIndex => ({
  id: name,
  name,
  kind: "global",
  partitionKey,
  sortKey,
  ...projection,
});

export const dynamoTable = (
  tableId: string,
  groupId: string,
  {
    attributes = [],
    partitionKey = null,
    sortKey = null,
    indexes = [],
    items = [],
    ttlAttribute = "",
  }: {
    attributes?: KeyAttribute[];
    partitionKey?: string | null;
    sortKey?: string | null;
    indexes?: DynamoIndex[];
    items?: ItemType[];
    ttlAttribute?: string;
  } = {},
): DesignNode =>
  within(
    groupId,
    node(tableId, "dynamo-table", tableId, {
      keySchema: { attributes, partitionKey, sortKey },
      indexes,
      items,
      ttlAttribute,
    }),
  );
