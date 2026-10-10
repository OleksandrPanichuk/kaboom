import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";

export const COLUMN_TYPES = [
  "uuid",
  "bigint",
  "integer",
  "text",
  "varchar",
  "boolean",
  "timestamptz",
  "date",
  "numeric",
  "jsonb",
] as const;

export type ColumnType = (typeof COLUMN_TYPES)[number];

export const MAX_COLUMNS = 64;
export const MAX_INDEXES = 32;

const ColumnIdSchema = z.string().min(1).max(64);

export const ColumnNameSchema = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/i, "use letters, digits and underscores")
  .max(63);

export const ColumnSchema = z.strictObject({
  id: ColumnIdSchema,
  name: ColumnNameSchema,
  type: z.enum(COLUMN_TYPES),
  nullable: z.boolean().default(false),
  primaryKey: z.boolean().default(false),
  unique: z.boolean().default(false),
});

export type Column = z.output<typeof ColumnSchema>;

export const IndexSchema = z.strictObject({
  id: ColumnIdSchema,
  columns: z.array(ColumnIdSchema).min(1).max(8),
  unique: z.boolean().default(false),
});

export type TableIndex = z.output<typeof IndexSchema>;

export const tableKind = defineNodeKind({
  kind: "table",
  track: "data-model",
  label: "Table",
  icon: "table",
  stateful: true,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "Rows of one kind of thing, with typed columns, a primary key and the indexes that make its lookups fast.",
    useWhen:
      "The data has an entity of its own, or a many-to-many link between two entities needs a row per pair.",
    pitfalls: [
      "A lookup by a column that leads no index reads the whole table.",
      "A foreign key whose type differs from the key it references cannot be declared, or forces a cast on every join.",
    ],
  },
  props: z
    .strictObject({
      columns: prop(z.array(ColumnSchema).max(MAX_COLUMNS).default([]), {
        title: "Columns",
        editor: "columns",
      }),
      indexes: prop(z.array(IndexSchema).max(MAX_INDEXES).default([]), {
        title: "Indexes",
        editor: "indexes",
      }),
    })
    .superRefine(({ columns, indexes }, context) => {
      const ids = new Set<string>();
      const names = new Set<string>();

      for (const [index, column] of columns.entries()) {
        if (ids.has(column.id)) {
          context.addIssue({
            code: "custom",
            path: ["columns", index, "id"],
            message: `repeats column id ${column.id}`,
          });
        }

        if (names.has(column.name.toLowerCase())) {
          context.addIssue({
            code: "custom",
            path: ["columns", index, "name"],
            message: `repeats column ${column.name}`,
          });
        }

        if (column.primaryKey && column.nullable) {
          context.addIssue({
            code: "custom",
            path: ["columns", index, "nullable"],
            message: `${column.name} is part of the primary key and cannot be null`,
          });
        }

        ids.add(column.id);
        names.add(column.name.toLowerCase());
      }

      const indexIds = new Set<string>();

      for (const [position, tableIndex] of indexes.entries()) {
        if (indexIds.has(tableIndex.id) || ids.has(tableIndex.id)) {
          context.addIssue({
            code: "custom",
            path: ["indexes", position, "id"],
            message: `repeats id ${tableIndex.id}`,
          });
        }

        indexIds.add(tableIndex.id);

        for (const columnId of tableIndex.columns) {
          if (!ids.has(columnId)) {
            context.addIssue({
              code: "custom",
              path: ["indexes", position, "columns"],
              message: `names no column ${columnId}`,
            });
          }
        }

        if (new Set(tableIndex.columns).size !== tableIndex.columns.length) {
          context.addIssue({
            code: "custom",
            path: ["indexes", position, "columns"],
            message: "names a column twice",
          });
        }
      }
    }),
});
