import type {
  DesignEdge,
  DesignNode,
  DesignOp,
  DocumentField,
  DocumentIndex,
} from "@repo/design";

export type CollectionNode = Extract<DesignNode, { kind: "collection" }>;

export type FieldPatch = Partial<Omit<DocumentField, "id" | "fields">>;

const shortId = (): string => crypto.randomUUID().slice(0, 8);

const update = (
  collection: CollectionNode,
  props: Partial<CollectionNode["props"]>,
): DesignOp => ({ op: "update-node", id: collection.id, patch: { props } });

const withoutUnset = <T extends object>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;

const mapAt = (
  fields: readonly DocumentField[],
  path: readonly string[],
  change: (field: DocumentField) => DocumentField | null,
): DocumentField[] => {
  const [head, ...rest] = path;

  return fields.flatMap((field) => {
    if (field.id !== head) return [field];
    if (rest.length === 0) {
      const next = change(field);

      return next ? [next] : [];
    }

    return [{ ...field, fields: mapAt(field.fields ?? [], rest, change) }];
  });
};

const nests = (field: Pick<DocumentField, "type" | "of">) =>
  field.type === "object" || (field.type === "array" && field.of === "object");

const freeName = (fields: readonly DocumentField[]): string => {
  const names = new Set(fields.map((field) => field.name.toLowerCase()));
  let suffix = fields.length + 1;

  while (names.has(`field_${suffix}`)) suffix += 1;

  return `field_${suffix}`;
};

export const addField = (
  collection: CollectionNode,
  parent: readonly string[] | null,
): DesignOp => {
  const create = (siblings: readonly DocumentField[]): DocumentField => ({
    id: `f-${shortId()}`,
    name: freeName(siblings),
    type: "string",
    required: false,
  });
  const { fields } = collection.props;

  return update(collection, {
    fields:
      parent === null
        ? [...fields, create(fields)]
        : mapAt(fields, parent, (field) => ({
            ...field,
            fields: [...(field.fields ?? []), create(field.fields ?? [])],
          })),
  });
};

export const updateField = (
  collection: CollectionNode,
  path: readonly string[],
  patch: FieldPatch,
): DesignOp =>
  update(collection, {
    fields: mapAt(collection.props.fields, path, (field) => {
      const next = withoutUnset({ ...field, ...patch });

      if (next.type !== "array") delete next.of;
      if (next.type === "array" && next.of === undefined) next.of = "string";
      if (!nests(next)) delete next.fields;
      if (next.type !== "string") {
        delete next.enum;
        delete next.maxLength;
      }
      if (!["int", "long", "double", "decimal"].includes(next.type)) {
        delete next.min;
        delete next.max;
      }

      return next;
    }),
  });

const startsWith = (path: readonly string[], prefix: readonly string[]) =>
  prefix.every((id, position) => path[position] === id);

export const removeField = (
  collection: CollectionNode,
  path: readonly string[],
  edges: readonly DesignEdge[],
): DesignOp[] => [
  ...edges
    .filter(
      (edge) =>
        edge.kind === "reference" &&
        edge.from === collection.id &&
        edge.reference !== undefined &&
        startsWith(edge.reference.fromField, path),
    )
    .map((edge): DesignOp => ({ op: "remove-edge", id: edge.id })),
  update(collection, {
    fields: mapAt(collection.props.fields, path, () => null),
    indexes: collection.props.indexes.filter(
      (index) =>
        !index.keys.some((key) => startsWith(key.path, path)) &&
        !(index.partial && startsWith(index.partial.path, path)),
    ),
  }),
];

export type DocumentIndexDraft = Omit<DocumentIndex, "id">;

export const addDocumentIndex = (
  collection: CollectionNode,
  draft: DocumentIndexDraft,
): DesignOp =>
  update(collection, {
    indexes: [
      ...collection.props.indexes,
      withoutUnset({ ...draft, id: `idx-${shortId()}` }),
    ],
  });

export const removeDocumentIndex = (
  collection: CollectionNode,
  indexId: string,
): DesignOp =>
  update(collection, {
    indexes: collection.props.indexes.filter((index) => index.id !== indexId),
  });
