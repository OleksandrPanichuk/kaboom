import z from "zod";

const ItemName = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/i)
  .max(63)
  .meta({ ref: "item", description: "An item type of a DynamoDB table" });
const AttributeName = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/i)
  .max(63);

export const PARTITION_WRITES_PER_SECOND = 1_000;
export const MAX_ITEM_KB = 400;

export const KeyValueRequirementsSchema = z.strictObject({
  patterns: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(64),
        title: z.string().min(1).max(160),
        items: z.array(ItemName).min(1).max(4),
        equal: z.array(AttributeName).max(4).default([]),
        range: AttributeName.optional(),
        returns: z.array(AttributeName).max(16).default([]),
      }),
    )
    .max(20)
    .default([]),
  writes: z
    .array(
      z.strictObject({
        item: ItemName,
        perSecond: z.number().positive().max(10_000_000),
      }),
    )
    .max(20)
    .default([]),
  cardinality: z
    .array(
      z.strictObject({
        item: ItemName,
        attribute: AttributeName,
        values: z.number().int().min(1).max(1_000_000_000),
      }),
    )
    .max(40)
    .default([]),
  apart: z
    .array(
      z.strictObject({
        item: ItemName,
        from: ItemName,
        max: z.number().int().min(1).max(100_000_000).nullable(),
        kb: z.number().positive().max(MAX_ITEM_KB),
      }),
    )
    .max(20)
    .default([]),
  ttl: z
    .array(z.strictObject({ item: ItemName }))
    .max(10)
    .default([]),
});

export type KeyValueRequirements = z.output<typeof KeyValueRequirementsSchema>;
