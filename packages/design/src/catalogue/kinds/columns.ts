import z from "zod";

export const COLUMN_TYPES = [
  "uuid",
  "smallint",
  "integer",
  "bigint",
  "numeric",
  "real",
  "double",
  "boolean",
  "text",
  "varchar",
  "char",
  "date",
  "time",
  "timestamp",
  "timestamptz",
  "json",
  "jsonb",
  "binary",
  "enum",
] as const;

export type ColumnType = (typeof COLUMN_TYPES)[number];

export const INTEGER_TYPES = new Set<ColumnType>([
  "smallint",
  "integer",
  "bigint",
]);

export const NUMBER_TYPES = new Set<ColumnType>([
  ...INTEGER_TYPES,
  "numeric",
  "real",
  "double",
]);

export const TEXT_TYPES = new Set<ColumnType>(["text", "varchar", "char"]);

export const TIME_TYPES = new Set<ColumnType>([
  "date",
  "time",
  "timestamp",
  "timestamptz",
]);

export const TIMESTAMP_TYPES = new Set<ColumnType>([
  "timestamp",
  "timestamptz",
]);

export const MAX_ENUM_VALUES = 64;

const ColumnIdSchema = z.string().min(1).max(64);

export const ColumnNameSchema = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/i, "use letters, digits and underscores")
  .max(63);

const SqlSchema = z.string().min(1).max(500);

export const ColumnDefaultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("literal"), value: z.string().max(255) }),
  z.strictObject({ kind: z.literal("now") }),
  z.strictObject({ kind: z.literal("uuid") }),
  z.strictObject({ kind: z.literal("expression"), sql: SqlSchema }),
]);

export type ColumnDefault = z.output<typeof ColumnDefaultSchema>;

export const ColumnGeneratedSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("identity"), always: z.boolean() }),
  z.strictObject({ kind: z.literal("stored"), sql: SqlSchema }),
]);

export type ColumnGenerated = z.output<typeof ColumnGeneratedSchema>;

export const ColumnChecksSchema = z.strictObject({
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().int().min(0).max(10_000).optional(),
  in: z.array(z.string().min(1).max(63)).min(1).max(MAX_ENUM_VALUES).optional(),
});

export type ColumnChecks = z.output<typeof ColumnChecksSchema>;

export const ColumnSchema = z
  .strictObject({
    id: ColumnIdSchema,
    name: ColumnNameSchema,
    type: z.enum(COLUMN_TYPES),
    length: z.number().int().min(1).max(10_485_760).optional(),
    precision: z.number().int().min(1).max(1_000).optional(),
    scale: z.number().int().min(0).max(1_000).optional(),
    values: z
      .array(z.string().min(1).max(63))
      .min(1)
      .max(MAX_ENUM_VALUES)
      .optional(),
    nullable: z.boolean().default(false),
    primaryKey: z.boolean().default(false),
    unique: z.boolean().default(false),
    default: ColumnDefaultSchema.optional(),
    generated: ColumnGeneratedSchema.optional(),
    onUpdate: z.literal("now").optional(),
    checks: ColumnChecksSchema.optional(),
  })
  .superRefine((column, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({
        code: "custom",
        path: [path],
        message: `${column.name} ${message}`,
      });
    const { type } = column;

    if (column.length !== undefined && type !== "varchar" && type !== "char") {
      issue("length", "has a length, which only varchar and char take");
    }

    if (
      (column.precision !== undefined || column.scale !== undefined) &&
      type !== "numeric"
    ) {
      issue("precision", "has a precision, which only numeric takes");
    }

    if (column.scale !== undefined && column.precision === undefined) {
      issue("scale", "has a scale without a precision");
    }

    if (
      column.scale !== undefined &&
      column.precision !== undefined &&
      column.scale > column.precision
    ) {
      issue("scale", "has a scale larger than its precision");
    }

    if (type === "enum" && column.values === undefined) {
      issue("values", "is an enum without values");
    }

    if (type !== "enum" && column.values !== undefined) {
      issue("values", "has enum values but is not an enum");
    }

    if (
      column.values !== undefined &&
      new Set(column.values).size !== column.values.length
    ) {
      issue("values", "repeats an enum value");
    }

    if (column.default !== undefined && column.generated !== undefined) {
      issue("default", "is generated, so it cannot have a default too");
    }

    switch (column.default?.kind) {
      case "now":
        if (!TIME_TYPES.has(type)) {
          issue("default", "defaults to now, which only a date or time can");
        }
        break;
      case "uuid":
        if (type !== "uuid") {
          issue("default", "defaults to a new uuid but is not a uuid");
        }
        break;
      case "literal": {
        const { value } = column.default;

        if (type === "enum" && !column.values?.includes(value)) {
          issue(
            "default",
            `defaults to ${value}, which is not one of its values`,
          );
        }

        if (type === "boolean" && value !== "true" && value !== "false") {
          issue("default", "is a boolean, so it defaults to true or false");
        }

        if (NUMBER_TYPES.has(type) && !Number.isFinite(Number(value))) {
          issue("default", `defaults to ${value}, which is not a number`);
        }
        break;
      }
      default:
        break;
    }

    if (column.generated?.kind === "identity") {
      if (!INTEGER_TYPES.has(type)) {
        issue("generated", "is an identity, which only an integer can be");
      }

      if (column.nullable) {
        issue("nullable", "is an identity, so it cannot be null");
      }
    }

    if (column.onUpdate === "now" && !TIMESTAMP_TYPES.has(type)) {
      issue("onUpdate", "updates to now, which only a timestamp can");
    }

    const checks = column.checks;

    if (checks) {
      if (
        (checks.min !== undefined || checks.max !== undefined) &&
        !NUMBER_TYPES.has(type)
      ) {
        issue("checks", "has a minimum or maximum, which only a number can");
      }

      if (
        checks.min !== undefined &&
        checks.max !== undefined &&
        checks.min > checks.max
      ) {
        issue("checks", "has a minimum above its maximum");
      }

      if (
        (checks.minLength !== undefined || checks.in !== undefined) &&
        !TEXT_TYPES.has(type)
      ) {
        issue("checks", "limits its text, which only a text column can");
      }

      if (
        checks.minLength !== undefined &&
        column.length !== undefined &&
        checks.minLength > column.length
      ) {
        issue("checks", "has a minimum length above its length");
      }
    }
  });

export type Column = z.output<typeof ColumnSchema>;

export const IndexSchema = z.strictObject({
  id: ColumnIdSchema,
  columns: z.array(ColumnIdSchema).min(1).max(8),
  unique: z.boolean().default(false),
});

export type TableIndex = z.output<typeof IndexSchema>;
