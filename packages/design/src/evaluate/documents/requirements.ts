import z from "zod";

const CollectionRef = z
  .string()
  .min(1)
  .max(64)
  .meta({ ref: "collection", description: "A collection of the baseline" });
const FieldPath = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/i)
  .max(255);

export const DocumentRequirementsSchema = z.strictObject({
  embedded: z
    .array(
      z.strictObject({
        collection: CollectionRef,
        field: FieldPath,
        max: z.number().int().min(1).max(10_000),
      }),
    )
    .max(20)
    .default([]),
  references: z
    .array(
      z.strictObject({
        from: CollectionRef,
        to: CollectionRef,
        growth: z.enum(["bounded", "unbounded"]),
      }),
    )
    .max(20)
    .default([]),
  queries: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(64),
        title: z.string().min(1).max(160),
        collection: CollectionRef,
        equal: z.array(FieldPath).max(4).default([]),
        sort: z
          .array(
            z.strictObject({
              field: FieldPath,
              direction: z.enum(["asc", "desc"]).default("asc"),
            }),
          )
          .max(3)
          .default([]),
        range: FieldPath.optional(),
      }),
    )
    .max(20)
    .default([]),
  unique: z
    .array(z.strictObject({ collection: CollectionRef, field: FieldPath }))
    .max(20)
    .default([]),
  ttl: z
    .array(z.strictObject({ collection: CollectionRef, field: FieldPath }))
    .max(10)
    .default([]),
});

export type DocumentRequirements = z.output<typeof DocumentRequirementsSchema>;
