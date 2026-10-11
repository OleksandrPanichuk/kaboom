import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";

export const KEY_ATTRIBUTE_TYPES = ["S", "N", "B"] as const;

export type KeyAttributeType = (typeof KEY_ATTRIBUTE_TYPES)[number];

export const ITEM_ATTRIBUTE_TYPES = [
  "S",
  "N",
  "B",
  "BOOL",
  "L",
  "M",
  "SS",
  "NS",
] as const;

export type ItemAttributeType = (typeof ITEM_ATTRIBUTE_TYPES)[number];

export const DYNAMO_INDEX_KINDS = ["global", "local"] as const;

export type DynamoIndexKind = (typeof DYNAMO_INDEX_KINDS)[number];

export const DYNAMO_PROJECTIONS = ["all", "keys-only", "include"] as const;

export type DynamoProjection = (typeof DYNAMO_PROJECTIONS)[number];

export const BILLING_MODES = ["on-demand", "provisioned"] as const;

export const MAX_GLOBAL_INDEXES = 20;
export const MAX_LOCAL_INDEXES = 5;
export const MAX_ITEM_TYPES = 16;
export const MAX_SHARDS = 100;

const IdSchema = z.string().min(1).max(64);

export const AttributeNameSchema = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/i, "use letters, digits and underscores")
  .max(63);

export const KeyAttributeSchema = z.strictObject({
  id: IdSchema,
  name: AttributeNameSchema,
  type: z.enum(KEY_ATTRIBUTE_TYPES).default("S"),
});

export type KeyAttribute = z.output<typeof KeyAttributeSchema>;

export const KeySchemaSchema = z.strictObject({
  attributes: z.array(KeyAttributeSchema).max(32).default([]),
  partitionKey: IdSchema.nullable().default(null),
  sortKey: IdSchema.nullable().default(null),
});

export type KeySchema = z.output<typeof KeySchemaSchema>;

export const DynamoIndexSchema = z.strictObject({
  id: IdSchema,
  name: z
    .string()
    .regex(/^[a-z0-9_.-]{3,255}$/i, "use 3 or more letters, digits, _ . or -"),
  kind: z.enum(DYNAMO_INDEX_KINDS).default("global"),
  partitionKey: IdSchema,
  sortKey: IdSchema.nullable().default(null),
  projection: z.enum(DYNAMO_PROJECTIONS).default("all"),
  include: z.array(AttributeNameSchema).max(20).optional(),
});

export type DynamoIndex = z.output<typeof DynamoIndexSchema>;

export const ItemAttributeSchema = z.strictObject({
  id: IdSchema,
  name: AttributeNameSchema,
  type: z.enum(ITEM_ATTRIBUTE_TYPES).default("S"),
  shards: z.number().int().min(2).max(MAX_SHARDS).optional(),
});

export type ItemAttribute = z.output<typeof ItemAttributeSchema>;

export const KeyTemplateSchema = z.string().min(1).max(255);

export const ItemTypeSchema = z.strictObject({
  id: IdSchema,
  name: AttributeNameSchema,
  attributes: z.array(ItemAttributeSchema).max(64).default([]),
  keys: z.record(IdSchema, KeyTemplateSchema).default({}),
});

export type ItemType = z.output<typeof ItemTypeSchema>;

const PLACEHOLDER = /\{([a-z_][a-z0-9_]*)\}/gi;

export type TemplatePart =
  { kind: "literal"; text: string } | { kind: "attribute"; name: string };

export const templateParts = (template: string): TemplatePart[] => {
  const parts: TemplatePart[] = [];
  let last = 0;

  for (const match of template.matchAll(PLACEHOLDER)) {
    const start = match.index ?? 0;

    if (start > last) {
      parts.push({ kind: "literal", text: template.slice(last, start) });
    }

    parts.push({ kind: "attribute", name: match[1]! });
    last = start + match[0].length;
  }

  if (last < template.length) {
    parts.push({ kind: "literal", text: template.slice(last) });
  }

  return parts;
};

export const placeholders = (template: string): string[] =>
  templateParts(template).flatMap((part) =>
    part.kind === "attribute" ? [part.name] : [],
  );

const tableIssues = ({
  keySchema,
  indexes,
  items,
}: {
  keySchema: KeySchema;
  indexes: DynamoIndex[];
  items: ItemType[];
}): Array<{ path: Array<string | number>; message: string }> => {
  const issues: Array<{ path: Array<string | number>; message: string }> = [];
  const attributes = new Map(
    keySchema.attributes.map((attribute) => [attribute.id, attribute]),
  );
  const attributeIds = new Set<string>();
  const attributeNames = new Set<string>();

  for (const [position, attribute] of keySchema.attributes.entries()) {
    const flag = (message: string) =>
      issues.push({ path: ["keySchema", "attributes", position], message });

    if (attributeIds.has(attribute.id))
      flag(`repeats attribute id ${attribute.id}`);
    if (attributeNames.has(attribute.name.toLowerCase()))
      flag(`repeats attribute ${attribute.name}`);

    attributeIds.add(attribute.id);
    attributeNames.add(attribute.name.toLowerCase());
  }

  if (
    keySchema.partitionKey !== null &&
    !attributes.has(keySchema.partitionKey)
  )
    issues.push({
      path: ["keySchema", "partitionKey"],
      message: `keys by ${keySchema.partitionKey}, which no attribute is`,
    });

  if (keySchema.sortKey !== null) {
    if (!attributes.has(keySchema.sortKey))
      issues.push({
        path: ["keySchema", "sortKey"],
        message: `sorts by ${keySchema.sortKey}, which no attribute is`,
      });
    if (keySchema.partitionKey === null)
      issues.push({
        path: ["keySchema", "sortKey"],
        message: "has a sort key and no partition key",
      });
    if (keySchema.sortKey === keySchema.partitionKey)
      issues.push({
        path: ["keySchema", "sortKey"],
        message: "sorts by its partition key",
      });
  }

  const indexIds = new Set<string>();
  const indexNames = new Set<string>();
  let global = 0;
  let local = 0;

  for (const [position, index] of indexes.entries()) {
    const flag = (message: string) =>
      issues.push({ path: ["indexes", position], message });

    if (indexIds.has(index.id)) flag(`repeats index id ${index.id}`);
    if (indexNames.has(index.name.toLowerCase()))
      flag(`repeats index ${index.name}`);

    indexIds.add(index.id);
    indexNames.add(index.name.toLowerCase());

    if (!attributes.has(index.partitionKey))
      flag(`keys by ${index.partitionKey}, which no attribute is`);
    if (index.sortKey !== null && !attributes.has(index.sortKey))
      flag(`sorts by ${index.sortKey}, which no attribute is`);
    if (index.sortKey === index.partitionKey)
      flag("sorts by its partition key");

    if (index.projection === "include" && !index.include?.length)
      flag("includes attributes but names none");
    if (index.projection !== "include" && index.include !== undefined)
      flag(
        "names attributes to include, which only an include projection does",
      );

    if (index.kind === "global") global += 1;
    else {
      local += 1;

      if (index.partitionKey !== keySchema.partitionKey)
        flag("is a local index, which keeps the table's partition key");
      if (index.sortKey === null || index.sortKey === keySchema.sortKey)
        flag("is a local index, which needs a sort key of its own");
      if (keySchema.sortKey === null)
        flag("is a local index on a table without a sort key");
    }
  }

  if (global > MAX_GLOBAL_INDEXES)
    issues.push({
      path: ["indexes"],
      message: `has ${global} global indexes; a table holds ${MAX_GLOBAL_INDEXES}`,
    });
  if (local > MAX_LOCAL_INDEXES)
    issues.push({
      path: ["indexes"],
      message: `has ${local} local indexes; a table holds ${MAX_LOCAL_INDEXES}`,
    });

  const itemIds = new Set<string>();
  const itemNames = new Set<string>();

  for (const [position, item] of items.entries()) {
    const flag = (message: string) =>
      issues.push({ path: ["items", position], message });

    if (itemIds.has(item.id)) flag(`repeats item type id ${item.id}`);
    if (itemNames.has(item.name.toLowerCase()))
      flag(`repeats item type ${item.name}`);

    itemIds.add(item.id);
    itemNames.add(item.name.toLowerCase());

    const own = new Map<string, ItemAttribute>();

    for (const attribute of item.attributes) {
      if (own.has(attribute.name.toLowerCase()))
        flag(`${item.name} repeats attribute ${attribute.name}`);
      if (attributeNames.has(attribute.name.toLowerCase()))
        flag(
          `${item.name}.${attribute.name} is named like a key attribute, which the item's keys fill in`,
        );

      own.set(attribute.name.toLowerCase(), attribute);
    }

    for (const [attributeId, template] of Object.entries(item.keys)) {
      const key = attributes.get(attributeId);

      if (!key) {
        flag(`${item.name} fills ${attributeId}, which no key attribute is`);
        continue;
      }

      for (const name of placeholders(template)) {
        if (!own.has(name.toLowerCase()))
          flag(
            `${item.name}'s ${key.name} uses {${name}}, which ${item.name} has no attribute for`,
          );
      }

      const parts = templateParts(template);

      if (key.type === "N") {
        const [only] = parts;
        const numeric =
          parts.length === 1 &&
          only?.kind === "attribute" &&
          own.get(only.name.toLowerCase())?.type === "N";

        if (!numeric)
          flag(
            `${item.name}'s ${key.name} is a number, so it holds one number attribute and nothing else`,
          );
      }
    }
  }

  return issues;
};

export const dynamoTableKind = defineNodeKind({
  kind: "dynamo-table",
  track: "data-model",
  label: "DynamoDB table",
  icon: "dynamo-table",
  stateful: true,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "Items found by a partition key and sorted by an optional sort key, where one table often holds several kinds of item.",
    useWhen:
      "Every way the data is read is known up front and can be answered by a key: the table's own or an index's.",
    pitfalls: [
      "A read that no key answers becomes a Scan of the whole table.",
      "A partition key with few values sends every write to the same partition, which takes 1,000 writes a second.",
      "An item stops at 400 KB, so a list that keeps growing belongs in items of its own.",
    ],
  },
  props: z
    .strictObject({
      keySchema: prop(KeySchemaSchema.default(KeySchemaSchema.parse({})), {
        title: "Keys",
        editor: "key-schema",
      }),
      indexes: prop(
        z
          .array(DynamoIndexSchema)
          .max(MAX_GLOBAL_INDEXES + MAX_LOCAL_INDEXES)
          .default([]),
        { title: "Indexes", editor: "dynamo-indexes" },
      ),
      items: prop(z.array(ItemTypeSchema).max(MAX_ITEM_TYPES).default([]), {
        title: "Item types",
        editor: "item-types",
      }),
      billing: prop(z.enum(BILLING_MODES).default("on-demand"), {
        title: "Capacity mode",
        description:
          "On demand pays per request; provisioned reserves the reads and writes below.",
      }),
      readCapacity: prop(z.number().int().min(1).max(40_000).default(5), {
        title: "Read capacity",
        unit: "count",
        advanced: true,
      }),
      writeCapacity: prop(z.number().int().min(1).max(40_000).default(5), {
        title: "Write capacity",
        unit: "count",
        advanced: true,
      }),
      ttlAttribute: prop(
        z
          .string()
          .regex(
            /^([a-z_][a-z0-9_]*)?$/i,
            "use letters, digits and underscores",
          )
          .max(63)
          .default(""),
        {
          title: "Expire by",
          description:
            "An item attribute holding epoch seconds; DynamoDB deletes an item once that time has passed.",
        },
      ),
    })
    .superRefine((props, context) => {
      for (const { path, message } of tableIssues(props)) {
        context.addIssue({ code: "custom", path, message });
      }
    }),
});
