import {
  type Column,
  type ColumnType,
  DEFAULT_ENGINE,
  type Engine,
  ENGINE_LABELS,
  INTEGER_TYPES,
} from "../catalogue";
import type { DesignGraph, DesignNode } from "../graph";
import { primaryKeyOf, type TableNode } from "./tables";

export type SqlEngine = Extract<Engine, "postgres" | "mysql" | "sqlite">;

export const SQL_ENGINES: readonly SqlEngine[] = [
  "postgres",
  "mysql",
  "sqlite",
];

const sized = (base: string, column: Column) =>
  column.length !== undefined ? `${base}(${column.length})` : base;

const numeric = (base: string, column: Column) =>
  column.precision === undefined
    ? base
    : column.scale === undefined
      ? `${base}(${column.precision})`
      : `${base}(${column.precision}, ${column.scale})`;

const quoted = (values: readonly string[]) =>
  values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ");

type Writer = (column: Column) => string;

const POSTGRES: Partial<Record<ColumnType, Writer>> = {
  uuid: () => "uuid",
  smallint: () => "smallint",
  integer: () => "integer",
  bigint: () => "bigint",
  numeric: (column) => numeric("numeric", column),
  real: () => "real",
  double: () => "double precision",
  boolean: () => "boolean",
  text: () => "text",
  varchar: (column) => sized("varchar", column),
  char: (column) => sized("char", column),
  date: () => "date",
  time: () => "time",
  timestamp: () => "timestamp",
  timestamptz: () => "timestamptz",
  json: () => "json",
  jsonb: () => "jsonb",
  binary: () => "bytea",
  enum: (column) => `${column.name}_type`,
};

const MYSQL: Partial<Record<ColumnType, Writer>> = {
  uuid: () => "char(36)",
  smallint: () => "smallint",
  integer: () => "int",
  bigint: () => "bigint",
  numeric: (column) => numeric("decimal", column),
  real: () => "float",
  double: () => "double",
  boolean: () => "boolean",
  text: () => "text",
  varchar: (column) => sized("varchar", column),
  char: (column) => sized("char", column),
  date: () => "date",
  time: () => "time",
  timestamp: () => "datetime",
  timestamptz: () => "timestamp",
  json: () => "json",
  binary: () => "blob",
  enum: (column) => `enum(${quoted(column.values ?? [])})`,
};

const SQLITE: Partial<Record<ColumnType, Writer>> = {
  uuid: () => "text",
  smallint: () => "integer",
  integer: () => "integer",
  bigint: () => "integer",
  numeric: () => "numeric",
  real: () => "real",
  double: () => "real",
  boolean: () => "integer",
  text: () => "text",
  varchar: () => "text",
  char: () => "text",
  date: () => "text",
  time: () => "text",
  timestamp: () => "text",
  timestamptz: () => "text",
  json: () => "text",
  binary: () => "blob",
  enum: () => "text",
};

const WRITERS: Readonly<
  Record<SqlEngine, Partial<Record<ColumnType, Writer>>>
> = { postgres: POSTGRES, mysql: MYSQL, sqlite: SQLITE };

export const isSqlEngine = (engine: Engine): engine is SqlEngine =>
  (SQL_ENGINES as readonly Engine[]).includes(engine);

export const engineTypes = (engine: SqlEngine): ColumnType[] =>
  Object.keys(WRITERS[engine]) as ColumnType[];

export const supportsType = (engine: SqlEngine, type: ColumnType): boolean =>
  WRITERS[engine][type] !== undefined;

export const writeType = (engine: SqlEngine, column: Column): string =>
  WRITERS[engine][column.type]?.(column) ?? column.type;

export const engineOf = (graph: DesignGraph, node: DesignNode): Engine => {
  const group = graph.groups.find((item) => item.id === node.groupId);

  return group?.kind === "database" && group.engine
    ? group.engine
    : DEFAULT_ENGINE;
};

export const engineIssues = (
  engine: SqlEngine,
  table: TableNode,
  column: Column,
): string[] => {
  const label = ENGINE_LABELS[engine];
  const name = `${table.label || table.id}.${column.name}`;
  const issues: string[] = [];

  if (!supportsType(engine, column.type)) {
    issues.push(`${label} has no ${column.type} type for ${name}.`);
  }

  if (engine === "mysql" && column.type === "varchar" && !column.length) {
    issues.push(
      `${name} is a varchar without a length, which ${label} refuses.`,
    );
  }

  if (column.onUpdate === "now" && engine !== "mysql") {
    issues.push(
      `${label} cannot set ${name} to now on update by itself; it takes a trigger.`,
    );
  }

  if (column.default?.kind === "uuid" && engine === "sqlite") {
    issues.push(`${label} cannot generate a uuid as the default of ${name}.`);
  }

  if (column.generated?.kind === "identity") {
    const key = primaryKeyOf(table);
    const soleKey = key.length === 1 && key[0]!.id === column.id;

    if (engine === "sqlite" && !(soleKey && INTEGER_TYPES.has(column.type))) {
      issues.push(
        `${label} numbers rows only for an integer primary key of its own, which ${name} is not.`,
      );
    }

    if (engine === "mysql" && column.generated.always) {
      issues.push(
        `${label} cannot forbid writing ${name} by hand; AUTO_INCREMENT always allows it.`,
      );
    }
  }

  return issues;
};
