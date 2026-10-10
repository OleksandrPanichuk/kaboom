import type {
  Column,
  DesignEdge,
  DesignNode,
  DesignOp,
  TableIndex,
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

export const updateColumn = (
  table: TableNode,
  columnId: string,
  patch: ColumnPatch,
): DesignOp =>
  update(table, {
    columns: table.props.columns.map((column) => {
      if (column.id !== columnId) return column;

      const next = { ...column, ...patch };

      return next.primaryKey ? { ...next, nullable: false } : next;
    }),
  });

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

export const addIndex = (
  table: TableNode,
  columns: readonly string[],
  unique: boolean,
): DesignOp =>
  update(table, {
    indexes: [
      ...table.props.indexes,
      { id: `idx-${shortId()}`, columns: [...columns], unique },
    ],
  });

export const removeIndex = (table: TableNode, indexId: string): DesignOp =>
  update(table, {
    indexes: table.props.indexes.filter((index) => index.id !== indexId),
  });
