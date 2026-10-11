import { type IndexFilter, type IndexMethod, TEXT_TYPES } from "../catalogue";
import { primaryKeyOf, type TableNode } from "./tables";

export type MatchKind = "contains" | "text-search";

export interface Lookup {
  equal: string[];
  lower?: string[];
  range?: string;
  order?: string[];
  where?: IndexFilter;
  match?: { column: string; kind: MatchKind };
}

interface IndexLike {
  columns: string[];
  method: IndexMethod;
  lower: Set<string>;
  where: IndexFilter | undefined;
}

const indexesOf = (table: TableNode): IndexLike[] => {
  const btree = (columns: string[]): IndexLike => ({
    columns,
    method: "btree",
    lower: new Set(),
    where: undefined,
  });
  const key = primaryKeyOf(table).map((column) => column.id);

  return [
    ...(key.length > 0 ? [btree(key)] : []),
    ...table.props.columns
      .filter((column) => column.unique)
      .map((column) => btree([column.id])),
    ...table.props.indexes.map((index) => ({
      columns: index.columns,
      method: index.method ?? "btree",
      lower: new Set(index.lower ?? []),
      where: index.where,
    })),
  ];
};

const sameFilter = (a: IndexFilter, b: IndexFilter): boolean =>
  a.column === b.column && a.op === b.op && (a.value ?? "") === (b.value ?? "");

const usable = (index: IndexLike, lookup: Lookup): boolean =>
  index.where === undefined ||
  (lookup.where !== undefined && sameFilter(index.where, lookup.where));

const servesMatch = (
  table: TableNode,
  index: IndexLike,
  lookup: Lookup,
): boolean => {
  const { match } = lookup;

  if (!match || !index.columns.includes(match.column)) return false;

  const column = table.props.columns.find((item) => item.id === match.column);

  if (match.kind === "contains") {
    return index.method === "gin" && column?.type === "jsonb";
  }

  return (
    (index.method === "gin" || index.method === "fulltext") &&
    column !== undefined &&
    TEXT_TYPES.has(column.type)
  );
};

const prefixLength = (index: IndexLike, lookup: Lookup): number | null => {
  const lowered = new Set(lookup.lower ?? []);
  const required = new Set([...lookup.equal, ...lowered]);
  const filter = lookup.where;

  if (filter && index.where === undefined) {
    if (filter.op !== "=" && filter.op !== "is-null") return null;

    required.add(filter.column);
  }

  const fits = (column: string) =>
    required.has(column) && lowered.has(column) === index.lower.has(column);

  for (let length = 0; length <= index.columns.length; length += 1) {
    const prefix = index.columns.slice(0, length);

    if (!prefix.every(fits)) return null;
    if ([...required].every((column) => prefix.includes(column))) return length;
  }

  return null;
};

const servesBtree = (index: IndexLike, lookup: Lookup): boolean => {
  const start = prefixLength(index, lookup);

  if (start === null) return false;

  const rest = index.columns.slice(start);
  const order = lookup.order ?? [];

  if (lookup.range !== undefined) {
    return (
      rest[0] === lookup.range &&
      !index.lower.has(lookup.range) &&
      (order.length === 0 || (order.length === 1 && order[0] === lookup.range))
    );
  }

  return order.every(
    (column, position) => rest[position] === column && !index.lower.has(column),
  );
};

const servesHash = (index: IndexLike, lookup: Lookup): boolean => {
  const columns = [...lookup.equal, ...(lookup.lower ?? [])];

  return (
    lookup.range === undefined &&
    (lookup.order ?? []).length === 0 &&
    columns.length === 1 &&
    index.columns.length === 1 &&
    index.columns[0] === columns[0] &&
    (lookup.lower ?? []).includes(columns[0]!) === index.lower.has(columns[0]!)
  );
};

export const servesLookup = (table: TableNode, lookup: Lookup): boolean =>
  indexesOf(table).some((index) => {
    if (!usable(index, lookup)) return false;
    if (lookup.match) return servesMatch(table, index, lookup);

    const asked =
      lookup.equal.length +
      (lookup.lower?.length ?? 0) +
      (lookup.range !== undefined ? 1 : 0) +
      (lookup.order?.length ?? 0) +
      (lookup.where !== undefined ? 1 : 0);

    if (asked === 0) return false;

    switch (index.method) {
      case "btree":
        return servesBtree(index, lookup);
      case "hash":
        return servesHash(index, lookup);
      default:
        return false;
    }
  });

export const indexedBy = (table: TableNode, columnIds: string[]): boolean =>
  servesLookup(table, { equal: columnIds });
