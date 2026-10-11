import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";

export const FIELD_TYPES = [
  "string",
  "int",
  "long",
  "double",
  "decimal",
  "bool",
  "date",
  "objectId",
  "object",
  "array",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const SCALAR_FIELD_TYPES = FIELD_TYPES.filter(
  (type) => type !== "object" && type !== "array",
);

export type ScalarFieldType = Exclude<FieldType, "object" | "array">;

export const MAX_FIELD_DEPTH = 4;
export const MAX_FIELDS = 64;

const FieldIdSchema = z.string().min(1).max(64);

export const FieldNameSchema = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/i, "use letters, digits and underscores")
  .max(63);

export interface DocumentField {
  id: string;
  name: string;
  type: FieldType;
  of?: ScalarFieldType | "object";
  required: boolean;
  fields?: DocumentField[];
  enum?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
}

export const DocumentFieldSchema: z.ZodType<DocumentField> = z.lazy(() =>
  z.strictObject({
    id: FieldIdSchema,
    name: FieldNameSchema,
    type: z.enum(FIELD_TYPES),
    of: z
      .enum([
        "string",
        "int",
        "long",
        "double",
        "decimal",
        "bool",
        "date",
        "objectId",
        "object",
      ])
      .optional(),
    required: z.boolean().default(false),
    fields: z.array(DocumentFieldSchema).max(MAX_FIELDS).optional(),
    enum: z.array(z.string().min(1).max(63)).min(1).max(64).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    maxLength: z.number().int().min(1).max(16_000_000).optional(),
  }),
);

export const DOCUMENT_INDEX_DIRECTIONS = ["asc", "desc", "text"] as const;

export type DocumentIndexDirection = (typeof DOCUMENT_INDEX_DIRECTIONS)[number];

export const DocumentIndexSchema = z.strictObject({
  id: FieldIdSchema,
  keys: z
    .array(
      z.strictObject({
        path: z.array(FieldIdSchema).min(1).max(MAX_FIELD_DEPTH),
        direction: z.enum(DOCUMENT_INDEX_DIRECTIONS).default("asc"),
      }),
    )
    .min(1)
    .max(8),
  unique: z.boolean().default(false),
  sparse: z.boolean().optional(),
  ttlSeconds: z.number().int().min(0).max(315_360_000).optional(),
  partial: z
    .strictObject({
      path: z.array(FieldIdSchema).min(1).max(MAX_FIELD_DEPTH),
      exists: z.literal(true).optional(),
      equals: z.string().max(255).optional(),
    })
    .optional(),
});

export type DocumentIndex = z.output<typeof DocumentIndexSchema>;

export const fieldAt = (
  fields: readonly DocumentField[],
  path: readonly string[],
): DocumentField | undefined => {
  const [head, ...rest] = path;
  const found = fields.find((field) => field.id === head);

  if (!found || rest.length === 0) return found;

  return fieldAt(found.fields ?? [], rest);
};

const fieldIssues = (
  fields: readonly DocumentField[],
  depth: number,
  prefix: string,
): string[] => {
  const issues: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const field of fields) {
    const name = `${prefix}${field.name}`;
    const nested =
      field.type === "object" ||
      (field.type === "array" && field.of === "object");

    if (ids.has(field.id)) issues.push(`repeats field id ${field.id}`);
    if (names.has(field.name.toLowerCase()))
      issues.push(`repeats field ${name}`);
    if (field.name === "_id")
      issues.push("names a field _id, which every document already has");

    ids.add(field.id);
    names.add(field.name.toLowerCase());

    if (field.type === "array" && field.of === undefined) {
      issues.push(`${name} is an array of nothing; say what it holds`);
    }

    if (field.type !== "array" && field.of !== undefined) {
      issues.push(`${name} says what it holds, which only an array does`);
    }

    if (nested && depth >= MAX_FIELD_DEPTH) {
      issues.push(`${name} nests deeper than ${MAX_FIELD_DEPTH} levels`);
    }

    if (!nested && field.fields !== undefined) {
      issues.push(`${name} has fields, which only an object does`);
    }

    if (field.enum !== undefined && field.type !== "string") {
      issues.push(`${name} lists values, which only a string can`);
    }

    if (
      (field.min !== undefined || field.max !== undefined) &&
      !["int", "long", "double", "decimal"].includes(field.type)
    ) {
      issues.push(`${name} has a minimum or maximum, which only a number can`);
    }

    if (field.maxLength !== undefined && field.type !== "string") {
      issues.push(`${name} has a maximum length, which only a string can`);
    }

    issues.push(...fieldIssues(field.fields ?? [], depth + 1, `${name}.`));
  }

  return issues;
};

export const collectionKind = defineNodeKind({
  kind: "collection",
  track: "data-model",
  label: "Collection",
  icon: "collection",
  stateful: true,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  home: {
    family: "document",
    required: true,
    engine: "mongodb",
    label: "Documents",
  },
  docs: {
    summary:
      "Documents of one kind in MongoDB, each a tree of fields that may embed objects and arrays of its own.",
    useWhen:
      "What is read together can live in one document, and what grows without bound has a collection of its own.",
    pitfalls: [
      "An array that keeps growing makes every read of its document slower, and a document stops at 16 MB.",
      "A query whose index keys are not equality, then sort, then range sorts in memory or scans.",
    ],
  },
  props: z
    .strictObject({
      fields: prop(z.array(DocumentFieldSchema).max(MAX_FIELDS).default([]), {
        title: "Fields",
        editor: "fields",
      }),
      indexes: prop(z.array(DocumentIndexSchema).max(32).default([]), {
        title: "Indexes",
        editor: "document-indexes",
      }),
    })
    .superRefine(({ fields, indexes }, context) => {
      for (const message of fieldIssues(fields, 1, "")) {
        context.addIssue({ code: "custom", path: ["fields"], message });
      }

      const indexIds = new Set<string>();

      for (const [position, index] of indexes.entries()) {
        const flag = (message: string) =>
          context.addIssue({
            code: "custom",
            path: ["indexes", position],
            message,
          });

        if (indexIds.has(index.id)) flag(`repeats index id ${index.id}`);
        indexIds.add(index.id);

        for (const key of index.keys) {
          if (key.path[0] !== "_id" && !fieldAt(fields, key.path)) {
            flag(`indexes ${key.path.join(".")}, which no field is`);
          }
        }

        if (index.partial && !fieldAt(fields, index.partial.path)) {
          flag(`filters on ${index.partial.path.join(".")}, which no field is`);
        }

        if (index.ttlSeconds !== undefined) {
          const [only] = index.keys;
          const field = only ? fieldAt(fields, only.path) : undefined;

          if (index.keys.length !== 1 || field?.type !== "date") {
            flag(
              "expires documents, which takes one date field as its only key",
            );
          }
        }

        if (
          index.unique &&
          index.keys.some((key) => key.direction === "text")
        ) {
          flag("is a text index, which cannot be unique");
        }
      }
    }),
});
