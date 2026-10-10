import z from "zod";

import { COLUMN_TYPES } from "../../catalogue";

const TableRef = z.string().min(1).max(64);
const ColumnRef = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/i)
  .max(63);

export const RelationshipRequirementSchema = z.discriminatedUnion(
  "cardinality",
  [
    z.strictObject({
      cardinality: z.literal("one-to-many"),
      parent: TableRef,
      child: TableRef,
    }),
    z.strictObject({
      cardinality: z.literal("one-to-one"),
      between: z.tuple([TableRef, TableRef]),
    }),
    z.strictObject({
      cardinality: z.literal("many-to-many"),
      between: z.tuple([TableRef, TableRef]),
    }),
  ],
);
export type RelationshipRequirement = z.output<
  typeof RelationshipRequirementSchema
>;

export const ColumnRequirementSchema = z.strictObject({
  table: TableRef,
  name: ColumnRef,
  type: z.enum(COLUMN_TYPES).optional(),
  unique: z.boolean().optional(),
  nullable: z.boolean().optional(),
});
export type ColumnRequirement = z.output<typeof ColumnRequirementSchema>;

export const QueryRequirementSchema = z.strictObject({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(160),
  from: TableRef,
  by: z.array(ColumnRef).min(1).max(4),
  to: TableRef.optional(),
  orderBy: z.array(ColumnRef).max(3).default([]),
});
export type QueryRequirement = z.output<typeof QueryRequirementSchema>;

export const SchemaRequirementsSchema = z.strictObject({
  relationships: z.array(RelationshipRequirementSchema).max(20).default([]),
  columns: z.array(ColumnRequirementSchema).max(40).default([]),
  queries: z.array(QueryRequirementSchema).max(20).default([]),
});
export type SchemaRequirements = z.output<typeof SchemaRequirementsSchema>;
export type SchemaRequirementsInput = z.input<typeof SchemaRequirementsSchema>;
