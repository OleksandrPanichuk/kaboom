import {
  type Column,
  type ColumnType,
  type DesignEdge,
  type DesignNode,
  type DesignOp,
  INTEGER_TYPES,
  type TableIndex,
  TIME_TYPES,
  TIMESTAMP_TYPES,
} from "@repo/design";

export type TableNode = Extract<DesignNode, { kind: "table" }>;

export type ColumnPatch = Partial<Omit<Column, "id">>;

const COLUMN_NAME = /^[a-z_][a-z0-9_]*$/i;

const shortId = (): string => crypto.randomUUID().slice(0, 8);

const update = (
  table: TableNode,
  props: Partial<TableNode["props"]>,
): DesignOp => ({
  op: "update-node",
  id: table.id,
  patch: { props },
});

export const columnNameProblem = (
  table: TableNode,
  columnId: string | null,
  name: string,
): string | null => {
  if (name.length === 0) return "Give the column a name.";
  if (name.length > 63) return "Keep it to 63 characters.";
  if (!COLUMN_NAME.test(name)) {
    return "Use letters, digits and underscores, starting with a letter.";
  }

  const taken = table.props.columns.some(
    (column) =>
      column.id !== columnId &&
      column.name.toLowerCase() === name.toLowerCase(),
  );

  return taken
    ? `${table.label || table.id} already has a column ${name}.`
    : null;
};

export const addColumn = (table: TableNode): DesignOp => {
  const names = new Set(
    table.props.columns.map((column) => column.name.toLowerCase()),
  );
  let suffix = table.props.columns.length + 1;

  while (names.has(`column_${suffix}`)) suffix += 1;

  return update(table, {
    columns: [
      ...table.props.columns,
      {
        id: `col-${shortId()}`,
        name: `column_${suffix}`,
        type: "text",
        nullable: false,
        primaryKey: false,
        unique: false,
      },
    ],
  });
};

const withoutUnset = <T extends object>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;

export const updateColumn = (
  table: TableNode,
  columnId: string,
  patch: ColumnPatch,
): DesignOp =>
  update(table, {
    columns: table.props.columns.map((column) => {
      if (column.id !== columnId) return column;

      const next = withoutUnset({ ...column, ...patch });

      return next.primaryKey ? { ...next, nullable: false } : next;
    }),
  });

export const readableRefusal = (message: string): string => {
  const detail = message.replace(/^Props of [^:]+: /, "");
  const first = detail.split("; ")[0] ?? detail;

  return first.replace(/^(?:columns|indexes)\.\d+(?:\.\w+)* /, "");
};

export const listOf = (text: string): string[] => [
  ...new Set(
    text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

export const moveColumn = (
  table: TableNode,
  columnId: string,
  by: -1 | 1,
): DesignOp | null => {
  const columns = [...table.props.columns];
  const from = columns.findIndex((column) => column.id === columnId);
  const to = from + by;

  if (from < 0 || to < 0 || to >= columns.length) return null;

  [columns[from], columns[to]] = [columns[to]!, columns[from]!];

  return update(table, { columns });
};

export const usesColumn = (
  edge: DesignEdge,
  tableId: string,
  columnId: string,
): boolean =>
  edge.kind === "relation" &&
  ((edge.from === tableId && edge.relation?.fromColumn === columnId) ||
    (edge.to === tableId && edge.relation?.toColumn === columnId));

export const removeColumn = (
  table: TableNode,
  columnId: string,
  edges: readonly DesignEdge[],
): DesignOp[] => [
  ...edges
    .filter((edge) => usesColumn(edge, table.id, columnId))
    .map((edge): DesignOp => ({ op: "remove-edge", id: edge.id })),
  update(table, {
    columns: table.props.columns.filter((column) => column.id !== columnId),
    indexes: table.props.indexes.flatMap((index) => {
      const columns = index.columns.filter((id) => id !== columnId);

      return columns.length > 0 ? [{ ...index, columns }] : [];
    }),
  }),
];

export const indexProblem = (
  table: TableNode,
  columns: readonly string[],
): string | null => {
  if (columns.length === 0) return "Pick the columns it leads with.";

  const same = (index: TableIndex) =>
    index.columns.length === columns.length &&
    index.columns.every((id, position) => id === columns[position]);

  return table.props.indexes.some(same)
    ? "An index on those columns, in that order, already exists."
    : null;
};

export type IndexDraft = Omit<TableIndex, "id">;

export const addIndex = (table: TableNode, draft: IndexDraft): DesignOp =>
  update(table, {
    indexes: [
      ...table.props.indexes,
      withoutUnset({
        ...draft,
        id: `idx-${shortId()}`,
        method: draft.method === "btree" ? undefined : draft.method,
        lower: draft.lower?.length ? draft.lower : undefined,
        include: draft.include?.length ? draft.include : undefined,
      }),
    ],
  });

export const removeIndex = (table: TableNode, indexId: string): DesignOp =>
  update(table, {
    indexes: table.props.indexes.filter((index) => index.id !== indexId),
  });

export const retype = (column: Column, type: ColumnType): ColumnPatch => {
  const keepsDefault =
    column.default === undefined ||
    column.default.kind === "expression" ||
    (column.default.kind === "now" && TIME_TYPES.has(type)) ||
    (column.default.kind === "uuid" && type === "uuid");

  return {
    type,
    length: type === "varchar" || type === "char" ? column.length : undefined,
    precision: type === "numeric" ? column.precision : undefined,
    scale: type === "numeric" ? column.scale : undefined,
    values: type === "enum" ? (column.values ?? ["value"]) : undefined,
    default: keepsDefault ? column.default : undefined,
    generated:
      column.generated?.kind === "identity" && !INTEGER_TYPES.has(type)
        ? undefined
        : column.generated,
    onUpdate: TIMESTAMP_TYPES.has(type) ? column.onUpdate : undefined,
    checks: undefined,
  };
};
