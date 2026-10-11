import {
  type Column,
  ENGINE_LABELS,
  type IndexFilter,
  NUMBER_TYPES,
  type TableIndex,
} from "../catalogue";
import type { DesignGraph, DesignGroup } from "../graph";
import { engineOf, isSqlEngine, type SqlEngine, writeType } from "./engines";
import {
  primaryKeyOf,
  relationsOf,
  type ResolvedRelation,
  tableName,
  type TableNode,
  tablesOf,
} from "./tables";

const IDENTIFIER_LIMIT = 63;

const ACTIONS = {
  restrict: "RESTRICT",
  cascade: "CASCADE",
  "set-null": "SET NULL",
} as const;

const quoter = (engine: SqlEngine) => (name: string) =>
  engine === "mysql"
    ? `\`${name.replaceAll("`", "``")}\``
    : `"${name.replaceAll('"', '""')}"`;

const text = (value: string) => `'${value.replaceAll("'", "''")}'`;

const enumTypeName = (table: TableNode, column: Column) =>
  `${tableName(table)}_${column.name}`;

const sqliteIdentity = (table: TableNode, column: Column) =>
  column.generated?.kind === "identity" &&
  primaryKeyOf(table).length === 1 &&
  primaryKeyOf(table)[0]!.id === column.id;

const literal = (engine: SqlEngine, column: Column, value: string) => {
  if (NUMBER_TYPES.has(column.type)) return value;
  if (column.type === "boolean") {
    return engine === "sqlite" ? (value === "true" ? "1" : "0") : value;
  }

  return text(value);
};

const defaultOf = (engine: SqlEngine, column: Column): string | null => {
  const fallback = column.default;

  switch (fallback?.kind) {
    case undefined:
      return null;
    case "literal":
      return literal(engine, column, fallback.value);
    case "expression":
      return `(${fallback.sql})`;
    case "uuid":
      return engine === "postgres"
        ? "gen_random_uuid()"
        : engine === "mysql"
          ? "(uuid())"
          : null;
    case "now":
      if (column.type === "date") {
        return engine === "mysql" ? "(CURRENT_DATE)" : "CURRENT_DATE";
      }
      if (column.type === "time") return "CURRENT_TIME";

      return engine === "postgres" ? "now()" : "CURRENT_TIMESTAMP";
  }
};

const checksOf = (
  engine: SqlEngine,
  column: Column,
  name: string,
): string[] => {
  const checks = column.checks ?? {};
  const length = engine === "sqlite" ? "length" : "char_length";
  const allowed =
    checks.in ??
    (column.type === "enum" && engine === "sqlite" ? column.values : undefined);

  return [
    ...(checks.min !== undefined ? [`${name} >= ${checks.min}`] : []),
    ...(checks.max !== undefined ? [`${name} <= ${checks.max}`] : []),
    ...(checks.minLength !== undefined
      ? [`${length}(${name}) >= ${checks.minLength}`]
      : []),
    ...(allowed ? [`${name} IN (${allowed.map(text).join(", ")})`] : []),
  ];
};

const columnLine = (engine: SqlEngine, table: TableNode, column: Column) => {
  const quote = quoter(engine);
  const name = quote(column.name);
  const type =
    engine === "postgres" && column.type === "enum"
      ? quote(enumTypeName(table, column))
      : writeType(engine, column);
  const generated = column.generated;
  const fallback = defaultOf(engine, column);
  const checks = checksOf(engine, column, name);
  const inlineKey = engine === "sqlite" && sqliteIdentity(table, column);

  return [
    `  ${name} ${type}`,
    ...(inlineKey ? ["PRIMARY KEY AUTOINCREMENT"] : []),
    ...(generated?.kind === "identity" && engine === "postgres"
      ? [`GENERATED ${generated.always ? "ALWAYS" : "BY DEFAULT"} AS IDENTITY`]
      : []),
    ...(generated?.kind === "stored"
      ? [`GENERATED ALWAYS AS (${generated.sql}) STORED`]
      : []),
    ...(column.nullable ? [] : ["NOT NULL"]),
    ...(column.unique && !column.primaryKey ? ["UNIQUE"] : []),
    ...(generated?.kind === "identity" && engine === "mysql"
      ? ["AUTO_INCREMENT"]
      : []),
    ...(fallback !== null ? [`DEFAULT ${fallback}`] : []),
    ...(column.onUpdate === "now" && engine === "mysql"
      ? ["ON UPDATE CURRENT_TIMESTAMP"]
      : []),
    ...(checks.length > 0 ? [`CHECK (${checks.join(" AND ")})`] : []),
  ].join(" ");
};

const references = (engine: SqlEngine, relation: ResolvedRelation) => {
  const quote = quoter(engine);
  const { to, pairs } = relation;
  const rules = relation.relation;

  return [
    `FOREIGN KEY (${pairs.map((pair) => quote(pair.from.name)).join(", ")})`,
    `REFERENCES ${quote(tableName(to))} (${pairs.map((pair) => quote(pair.to.name)).join(", ")})`,
    `ON DELETE ${ACTIONS[rules.onDelete]}`,
    ...(rules.onUpdate ? [`ON UPDATE ${ACTIONS[rules.onUpdate]}`] : []),
    ...(rules.deferrable && engine === "postgres"
      ? ["DEFERRABLE INITIALLY DEFERRED"]
      : []),
  ].join(" ");
};

const createTable = (
  engine: SqlEngine,
  table: TableNode,
  inline: ResolvedRelation[],
) => {
  const quote = quoter(engine);
  const key = primaryKeyOf(table);
  const keyInline = table.props.columns.some(
    (column) => engine === "sqlite" && sqliteIdentity(table, column),
  );
  const lines = [
    ...table.props.columns.map((column) => columnLine(engine, table, column)),
    ...(key.length > 0 && !keyInline
      ? [
          `  PRIMARY KEY (${key.map((column) => quote(column.name)).join(", ")})`,
        ]
      : []),
    ...inline.map((relation) => `  ${references(engine, relation)}`),
  ];

  return `CREATE TABLE ${quote(tableName(table))} (\n${lines.join(",\n")}\n);`;
};

const filterOf = (
  quote: (name: string) => string,
  filter: IndexFilter,
  name: string,
) => {
  const column = quote(name);

  switch (filter.op) {
    case "=":
      return `${column} = ${text(filter.value ?? "")}`;
    case "!=":
      return `${column} <> ${text(filter.value ?? "")}`;
    case "is-null":
      return `${column} IS NULL`;
    case "is-not-null":
      return `${column} IS NOT NULL`;
  }
};

const createIndex = (
  engine: SqlEngine,
  table: TableNode,
  index: TableIndex,
) => {
  const quote = quoter(engine);
  const nameOf = (id: string) =>
    table.props.columns.find((column) => column.id === id)?.name ?? id;
  const method = index.method ?? "btree";
  const columns = index.columns.map((id) => {
    const name = quote(nameOf(id));
    const lowered = index.lower?.includes(id)
      ? engine === "mysql"
        ? `(lower(${name}))`
        : `lower(${name})`
      : name;

    return index.descending?.includes(id) ? `${lowered} DESC` : lowered;
  });
  const indexName = quote(
    `${tableName(table)}_${index.columns.map(nameOf).join("_")}_idx`.slice(
      0,
      IDENTIFIER_LIMIT,
    ),
  );
  const target = quote(tableName(table));
  const kind =
    method === "fulltext" && engine === "mysql"
      ? "FULLTEXT "
      : index.unique
        ? "UNIQUE "
        : "";
  const using =
    engine === "postgres" && method !== "btree"
      ? ` USING ${method}`
      : engine === "mysql" && method === "hash"
        ? " USING HASH"
        : "";
  const include =
    engine === "postgres" && index.include
      ? ` INCLUDE (${index.include.map((id) => quote(nameOf(id))).join(", ")})`
      : "";
  const where =
    engine !== "mysql" && index.where
      ? ` WHERE ${filterOf(quote, index.where, nameOf(index.where.column))}`
      : "";

  return `CREATE ${kind}INDEX ${indexName} ON ${target}${using} (${columns.join(", ")})${include}${where};`;
};

const writeDatabase = (
  engine: SqlEngine,
  tables: TableNode[],
  relations: ResolvedRelation[],
): string[] => {
  const quote = quoter(engine);
  const ids = new Set(tables.map((table) => table.id));
  const own = relations.filter(
    (relation) => ids.has(relation.from.id) && ids.has(relation.to.id),
  );
  const enums =
    engine === "postgres"
      ? tables.flatMap((table) =>
          table.props.columns
            .filter((column) => column.type === "enum")
            .map(
              (column) =>
                `CREATE TYPE ${quote(enumTypeName(table, column))} AS ENUM (${(column.values ?? []).map(text).join(", ")});`,
            ),
        )
      : [];
  const created = tables.map((table) =>
    createTable(
      engine,
      table,
      engine === "sqlite"
        ? own.filter((relation) => relation.from.id === table.id)
        : [],
    ),
  );
  const altered =
    engine === "sqlite"
      ? []
      : own.map(
          (relation) =>
            `ALTER TABLE ${quote(tableName(relation.from))} ADD ${references(engine, relation)};`,
        );
  const indexes = tables.flatMap((table) =>
    table.props.indexes.map((index) => createIndex(engine, table, index)),
  );

  return [...enums, ...created, ...altered, ...indexes];
};

export const toDDL = (graph: DesignGraph): string => {
  const tables = tablesOf(graph);
  const relations = relationsOf(graph);
  const databases = new Map<
    string | null,
    { group: DesignGroup | null; tables: TableNode[] }
  >();

  for (const table of tables) {
    const group = graph.groups.find(
      (item) => item.id === table.groupId && item.kind === "database",
    );
    const key = group?.id ?? null;
    const entry = databases.get(key) ?? { group: group ?? null, tables: [] };

    entry.tables.push(table);
    databases.set(key, entry);
  }

  const headed = graph.groups.some((group) => group.kind === "database");

  return [...databases.values()]
    .flatMap(({ group, tables: members }) => {
      const engine = engineOf(graph, members[0]!);

      if (!isSqlEngine(engine)) return [];

      const statements = writeDatabase(engine, members, relations);

      return headed
        ? [
            `-- ${group ? group.label : "Tables outside a database"} (${ENGINE_LABELS[engine]})`,
            ...statements,
          ]
        : statements;
    })
    .join("\n\n");
};
