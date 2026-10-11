import type { DocumentField, DocumentIndex } from "../catalogue";
import type { DesignGraph } from "../graph";
import {
  collectionName,
  type CollectionNode,
  collectionsOf,
  pathNames,
} from "./documents";

const BSON_TYPES: Readonly<Record<string, string>> = {
  string: "string",
  int: "int",
  long: "long",
  double: "double",
  decimal: "decimal",
  bool: "bool",
  date: "date",
  objectId: "objectId",
  object: "object",
  array: "array",
};

type JsonSchema = Record<string, unknown>;

const schemaOf = (field: DocumentField): JsonSchema => {
  const nested = (fields: readonly DocumentField[]): JsonSchema => ({
    bsonType: "object",
    ...(fields.some((item) => item.required)
      ? {
          required: fields
            .filter((item) => item.required)
            .map((item) => item.name),
        }
      : {}),
    properties: Object.fromEntries(
      fields.map((item) => [item.name, schemaOf(item)]),
    ),
  });

  if (field.type === "object") return nested(field.fields ?? []);

  if (field.type === "array") {
    return {
      bsonType: "array",
      items:
        field.of === "object"
          ? nested(field.fields ?? [])
          : { bsonType: BSON_TYPES[field.of ?? "string"] },
    };
  }

  return {
    bsonType: BSON_TYPES[field.type],
    ...(field.enum ? { enum: field.enum } : {}),
    ...(field.min !== undefined ? { minimum: field.min } : {}),
    ...(field.max !== undefined ? { maximum: field.max } : {}),
    ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}),
  };
};

const createCollection = (collection: CollectionNode): string => {
  const { fields } = collection.props;
  const validator = {
    $jsonSchema: {
      bsonType: "object",
      ...(fields.some((field) => field.required)
        ? {
            required: fields
              .filter((field) => field.required)
              .map((field) => field.name),
          }
        : {}),
      properties: Object.fromEntries(
        fields.map((field) => [field.name, schemaOf(field)]),
      ),
    },
  };

  return `db.createCollection(${JSON.stringify(collectionName(collection))}, ${JSON.stringify({ validator }, null, 2)});`;
};

const createIndex = (
  collection: CollectionNode,
  index: DocumentIndex,
): string => {
  const name = (path: readonly string[]) =>
    path[0] === "_id" ? "_id" : pathNames(collection.props.fields, path);
  const keys = Object.fromEntries(
    index.keys.map((item) => [
      name(item.path),
      item.direction === "text" ? "text" : item.direction === "desc" ? -1 : 1,
    ]),
  );
  const options = {
    ...(index.unique ? { unique: true } : {}),
    ...(index.sparse ? { sparse: true } : {}),
    ...(index.ttlSeconds !== undefined
      ? { expireAfterSeconds: index.ttlSeconds }
      : {}),
    ...(index.partial
      ? {
          partialFilterExpression: {
            [name(index.partial.path)]: index.partial.equals ?? {
              $exists: true,
            },
          },
        }
      : {}),
  };

  return `db.getCollection(${JSON.stringify(collectionName(collection))}).createIndex(${JSON.stringify(keys)}${Object.keys(options).length > 0 ? `, ${JSON.stringify(options)}` : ""});`;
};

export const toMongo = (graph: DesignGraph): string => {
  const collections = collectionsOf(graph);
  const databases = new Map<string, CollectionNode[]>();

  for (const collection of collections) {
    const group = graph.groups.find((item) => item.id === collection.groupId);
    const label = group?.label ?? "app";

    databases.set(label, [...(databases.get(label) ?? []), collection]);
  }

  return [...databases.entries()]
    .flatMap(([label, members]) => [
      `use(${JSON.stringify(label)});`,
      ...members.map(createCollection),
      ...members.flatMap((collection) =>
        collection.props.indexes.map((index) => createIndex(collection, index)),
      ),
    ])
    .join("\n\n");
};
