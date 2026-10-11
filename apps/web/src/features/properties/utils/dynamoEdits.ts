import {
  type DesignNode,
  type DesignOp,
  type DynamoIndex,
  type ItemAttribute,
  type ItemType,
  type KeyAttribute,
  placeholders,
} from "@repo/design";

export type DynamoTableNode = Extract<DesignNode, { kind: "dynamo-table" }>;

export type NewDynamoIndex = Omit<DynamoIndex, "id">;

const shortId = (): string => crypto.randomUUID().slice(0, 8);

const update = (
  table: DynamoTableNode,
  props: Partial<DynamoTableNode["props"]>,
): DesignOp => ({ op: "update-node", id: table.id, patch: { props } });

const freeName = (taken: readonly string[], base: string): string => {
  const names = new Set(taken.map((name) => name.toLowerCase()));
  let suffix = taken.length + 1;

  while (names.has(`${base}${suffix}`.toLowerCase())) suffix += 1;

  return `${base}${suffix}`;
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const mapItem = (
  table: DynamoTableNode,
  itemId: string,
  change: (item: ItemType) => ItemType,
): ItemType[] =>
  table.props.items.map((item) => (item.id === itemId ? change(item) : item));

export const addKeyAttribute = (table: DynamoTableNode): DesignOp => {
  const { keySchema } = table.props;

  return update(table, {
    keySchema: {
      ...keySchema,
      attributes: [
        ...keySchema.attributes,
        {
          id: `k-${shortId()}`,
          name: freeName(
            keySchema.attributes.map((attribute) => attribute.name),
            "KEY",
          ),
          type: "S",
        },
      ],
    },
  });
};

export const updateKeyAttribute = (
  table: DynamoTableNode,
  id: string,
  patch: Partial<Omit<KeyAttribute, "id">>,
): DesignOp => {
  const { keySchema } = table.props;

  return update(table, {
    keySchema: {
      ...keySchema,
      attributes: keySchema.attributes.map((attribute) =>
        attribute.id === id ? { ...attribute, ...patch } : attribute,
      ),
    },
  });
};

export const removeKeyAttribute = (
  table: DynamoTableNode,
  id: string,
): DesignOp => {
  const { keySchema, indexes, items } = table.props;
  const partitionKey =
    keySchema.partitionKey === id ? null : keySchema.partitionKey;

  return update(table, {
    keySchema: {
      attributes: keySchema.attributes.filter(
        (attribute) => attribute.id !== id,
      ),
      partitionKey,
      sortKey:
        keySchema.sortKey === id || partitionKey === null
          ? null
          : keySchema.sortKey,
    },
    indexes: indexes.filter(
      (index) => index.partitionKey !== id && index.sortKey !== id,
    ),
    items: items.map((item) => ({
      ...item,
      keys: Object.fromEntries(
        Object.entries(item.keys).filter(([key]) => key !== id),
      ),
    })),
  });
};

export const setTableKey = (
  table: DynamoTableNode,
  role: "partition" | "sort",
  id: string | null,
): DesignOp => {
  const { keySchema } = table.props;

  return update(table, {
    keySchema:
      role === "partition"
        ? {
            ...keySchema,
            partitionKey: id,
            sortKey: keySchema.sortKey === id ? null : keySchema.sortKey,
          }
        : { ...keySchema, sortKey: id },
  });
};

export const addDynamoIndex = (
  table: DynamoTableNode,
  index: NewDynamoIndex,
): DesignOp =>
  update(table, {
    indexes: [...table.props.indexes, { id: `i-${shortId()}`, ...index }],
  });

export const removeDynamoIndex = (
  table: DynamoTableNode,
  id: string,
): DesignOp =>
  update(table, {
    indexes: table.props.indexes.filter((index) => index.id !== id),
  });

export const addItemType = (table: DynamoTableNode): DesignOp =>
  update(table, {
    items: [
      ...table.props.items,
      {
        id: `t-${shortId()}`,
        name: freeName(
          table.props.items.map((item) => item.name),
          "Item",
        ),
        attributes: [],
        keys: {},
      },
    ],
  });

export const renameItemType = (
  table: DynamoTableNode,
  itemId: string,
  name: string,
): DesignOp =>
  update(table, {
    items: mapItem(table, itemId, (item) => ({ ...item, name })),
  });

export const removeItemType = (
  table: DynamoTableNode,
  itemId: string,
): DesignOp =>
  update(table, {
    items: table.props.items.filter((item) => item.id !== itemId),
  });

export const addItemAttribute = (
  table: DynamoTableNode,
  itemId: string,
): DesignOp =>
  update(table, {
    items: mapItem(table, itemId, (item) => ({
      ...item,
      attributes: [
        ...item.attributes,
        {
          id: `a-${shortId()}`,
          name: freeName(
            item.attributes.map((attribute) => attribute.name),
            "attr_",
          ),
          type: "S",
        },
      ],
    })),
  });

export const updateItemAttribute = (
  table: DynamoTableNode,
  itemId: string,
  attributeId: string,
  patch: Partial<Omit<ItemAttribute, "id">>,
): DesignOp =>
  update(table, {
    items: mapItem(table, itemId, (item) => {
      const before = item.attributes.find(
        (attribute) => attribute.id === attributeId,
      );
      const renamed =
        before && patch.name !== undefined && patch.name !== before.name
          ? new RegExp(`\\{${escape(before.name)}\\}`, "gi")
          : null;

      return {
        ...item,
        attributes: item.attributes.map((attribute) => {
          if (attribute.id !== attributeId) return attribute;

          const next = { ...attribute, ...patch };

          if (patch.shards === undefined && "shards" in patch) {
            delete next.shards;
          }

          return next;
        }),
        keys: renamed
          ? Object.fromEntries(
              Object.entries(item.keys).map(([key, template]) => [
                key,
                template.replace(renamed, `{${patch.name}}`),
              ]),
            )
          : item.keys,
      };
    }),
  });

export const removeItemAttribute = (
  table: DynamoTableNode,
  itemId: string,
  attributeId: string,
): DesignOp =>
  update(table, {
    items: mapItem(table, itemId, (item) => {
      const gone = item.attributes.find(
        (attribute) => attribute.id === attributeId,
      );

      return {
        ...item,
        attributes: item.attributes.filter(
          (attribute) => attribute.id !== attributeId,
        ),
        keys: Object.fromEntries(
          Object.entries(item.keys).filter(
            ([, template]) =>
              !gone ||
              !placeholders(template).some(
                (name) => name.toLowerCase() === gone.name.toLowerCase(),
              ),
          ),
        ),
      };
    }),
  });

export const setItemKey = (
  table: DynamoTableNode,
  itemId: string,
  keyId: string,
  template: string,
): DesignOp =>
  update(table, {
    items: mapItem(table, itemId, (item) => {
      const keys = Object.fromEntries(
        Object.entries(item.keys).filter(([key]) => key !== keyId),
      );

      return {
        ...item,
        keys: template === "" ? keys : { ...keys, [keyId]: template },
      };
    }),
  });

export const keysInUse = (table: DynamoTableNode): KeyAttribute[] => {
  const { keySchema, indexes } = table.props;
  const used = new Set(
    [
      keySchema.partitionKey,
      keySchema.sortKey,
      ...indexes.flatMap((index) => [index.partitionKey, index.sortKey]),
    ].filter((id) => id !== null),
  );

  return keySchema.attributes.filter((attribute) => used.has(attribute.id));
};
