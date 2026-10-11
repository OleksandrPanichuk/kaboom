import type { Column, Relation } from "../catalogue";
import type { DesignEdge, DesignGraph, NodeFor } from "../graph";

export type TableNode = NodeFor<"table">;

export interface ColumnPair {
  from: Column;
  to: Column;
}

export interface ResolvedRelation {
  edge: DesignEdge;
  relation: Relation;
  from: TableNode;
  to: TableNode;
  foreignKey: Column;
  referenced: Column;
  pairs: ColumnPair[];
}

export const relationPairs = (
  relation: Relation,
): Array<{ fromColumn: string; toColumn: string }> => [
  { fromColumn: relation.fromColumn, toColumn: relation.toColumn },
  ...(relation.moreColumns ?? []),
];

export const tablesOf = (graph: DesignGraph): TableNode[] =>
  graph.nodes.filter((node): node is TableNode => node.kind === "table");

export const tableName = (table: TableNode): string => table.label || table.id;

export const columnName = (table: TableNode, column: Column): string =>
  `${tableName(table)}.${column.name}`;

export const primaryKeyOf = (table: TableNode): Column[] =>
  table.props.columns.filter((column) => column.primaryKey);

export const relationsOf = (graph: DesignGraph): ResolvedRelation[] => {
  const tables = new Map(tablesOf(graph).map((table) => [table.id, table]));

  return graph.edges.flatMap((edge) => {
    const from = tables.get(edge.from);
    const to = tables.get(edge.to);
    const relation = edge.relation;

    if (edge.kind !== "relation" || !from || !to || !relation) return [];

    const pairs = relationPairs(relation).map((pair) => ({
      from: from.props.columns.find((column) => column.id === pair.fromColumn),
      to: to.props.columns.find((column) => column.id === pair.toColumn),
    }));

    if (pairs.some((pair) => !pair.from || !pair.to)) return [];

    const resolved = pairs as ColumnPair[];

    return [
      {
        edge,
        relation,
        from,
        to,
        foreignKey: resolved[0]!.from,
        referenced: resolved[0]!.to,
        pairs: resolved,
      },
    ];
  });
};

export const keyOrders = (table: TableNode): string[][] => {
  const key = primaryKeyOf(table).map((column) => column.id);

  return [
    ...(key.length > 0 ? [key] : []),
    ...table.props.columns
      .filter((column) => column.unique)
      .map((column) => [column.id]),
    ...table.props.indexes.map((index) => index.columns),
  ];
};

export const leadsWith = (order: string[], columnIds: string[]): boolean =>
  columnIds.length > 0 &&
  columnIds.length <= order.length &&
  columnIds.every((id) => order.slice(0, columnIds.length).includes(id));

export const indexedBy = (table: TableNode, columnIds: string[]): boolean =>
  keyOrders(table).some((order) => leadsWith(order, columnIds));

export const uniqueOver = (table: TableNode, columnIds: string[]): boolean => {
  const wanted = new Set(columnIds);
  const covers = (order: string[]) =>
    order.length > 0 && order.every((id) => wanted.has(id));

  return (
    covers(primaryKeyOf(table).map((column) => column.id)) ||
    table.props.columns.some(
      (column) => column.unique && wanted.has(column.id),
    ) ||
    table.props.indexes.some((index) => index.unique && covers(index.columns))
  );
};

export const foreignKeyIds = ({ pairs }: ResolvedRelation): string[] =>
  pairs.map((pair) => pair.from.id);

export const isOneToOne = (relation: ResolvedRelation): boolean =>
  uniqueOver(relation.from, foreignKeyIds(relation));

export const isKeyExactly = (
  table: TableNode,
  columnIds: string[],
): boolean => {
  const wanted = new Set(columnIds);
  const same = (ids: string[]) =>
    ids.length === wanted.size && ids.every((id) => wanted.has(id));
  const key = primaryKeyOf(table).map((column) => column.id);

  return (
    same(key) ||
    (columnIds.length === 1 &&
      table.props.columns.some(
        (column) => column.unique && column.id === columnIds[0],
      )) ||
    table.props.indexes.some((index) => index.unique && same(index.columns))
  );
};

export const columnsName = (table: TableNode, columns: Column[]): string =>
  columns.length === 1
    ? columnName(table, columns[0]!)
    : `${tableName(table)}.(${columns.map((column) => column.name).join(", ")})`;
