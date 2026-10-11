import type { DesignGraph } from "../graph";
import { engineOf, isSqlEngine, writeType } from "./engines";
import {
  primaryKeyOf,
  relationsOf,
  tableName,
  type TableNode,
  tablesOf,
} from "./tables";

const IDENTIFIER_LIMIT = 63;

const quote = (name: string): string => `"${name.replaceAll('"', '""')}"`;

const ON_DELETE = {
  restrict: "RESTRICT",
  cascade: "CASCADE",
  "set-null": "SET NULL",
} as const;

const createTable = (graph: DesignGraph, table: TableNode): string => {
  const engine = engineOf(graph, table);
  const key = primaryKeyOf(table);
  const lines = [
    ...table.props.columns.map((column) =>
      [
        `  ${quote(column.name)} ${isSqlEngine(engine) ? writeType(engine, column) : column.type}`,
        ...(column.nullable ? [] : ["NOT NULL"]),
        ...(column.unique ? ["UNIQUE"] : []),
      ].join(" "),
    ),
    ...(key.length > 0
      ? [
          `  PRIMARY KEY (${key.map((column) => quote(column.name)).join(", ")})`,
        ]
      : []),
  ];

  return `CREATE TABLE ${quote(tableName(table))} (\n${lines.join(",\n")}\n);`;
};

const createIndexes = (table: TableNode): string[] => {
  const names = new Map(
    table.props.columns.map((column) => [column.id, column.name]),
  );

  return table.props.indexes.map((index) => {
    const columns = index.columns.map((id) => names.get(id) ?? id);
    const name = `${tableName(table)}_${columns.join("_")}_idx`.slice(
      0,
      IDENTIFIER_LIMIT,
    );

    return `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${quote(name)} ON ${quote(tableName(table))} (${columns.map(quote).join(", ")});`;
  });
};

export const toDDL = (graph: DesignGraph): string => {
  const tables = tablesOf(graph);
  const foreignKeys = relationsOf(graph).map(
    ({ from, to, pairs, relation }) =>
      `ALTER TABLE ${quote(tableName(from))} ADD FOREIGN KEY (${pairs.map((pair) => quote(pair.from.name)).join(", ")}) REFERENCES ${quote(tableName(to))} (${pairs.map((pair) => quote(pair.to.name)).join(", ")}) ON DELETE ${ON_DELETE[relation.onDelete]};`,
  );

  return [
    ...tables.map((table) => createTable(graph, table)),
    ...foreignKeys,
    ...tables.flatMap(createIndexes),
  ].join("\n\n");
};
