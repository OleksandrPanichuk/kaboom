import type {
  Column,
  ColumnType,
  EdgeKind,
  EdgeProps,
  NodeKind,
  OnDeleteAction,
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
  indexes: Array<ReturnType<typeof index>> = [],
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
