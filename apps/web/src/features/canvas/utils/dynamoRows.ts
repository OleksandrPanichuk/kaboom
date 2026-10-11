import type { DesignNode, DynamoIndex, ItemType } from "@repo/design";

export type DynamoTableNode = Extract<DesignNode, { kind: "dynamo-table" }>;

export type DynamoRow =
  | {
      kind: "key";
      id: string;
      role: "partition" | "sort";
      name: string;
      type: string;
    }
  | { kind: "no-key"; id: string }
  | { kind: "index"; id: string; index: DynamoIndex; keys: string }
  | { kind: "item"; id: string; item: ItemType; keys: string };

export const dynamoRows = (table: DynamoTableNode): DynamoRow[] => {
  const { keySchema, indexes, items } = table.props;
  const attribute = (id: string | null) =>
    keySchema.attributes.find((item) => item.id === id);
  const partition = attribute(keySchema.partitionKey);
  const sort = attribute(keySchema.sortKey);
  const nameOf = (id: string | null) => attribute(id)?.name ?? id ?? "";

  return [
    ...(partition
      ? [
          {
            kind: "key" as const,
            id: "key:partition",
            role: "partition" as const,
            name: partition.name,
            type: partition.type,
          },
        ]
      : [{ kind: "no-key" as const, id: "key:none" }]),
    ...(sort
      ? [
          {
            kind: "key" as const,
            id: "key:sort",
            role: "sort" as const,
            name: sort.name,
            type: sort.type,
          },
        ]
      : []),
    ...indexes.map((index) => ({
      kind: "index" as const,
      id: `index:${index.id}`,
      index,
      keys: [index.partitionKey, index.sortKey]
        .filter((id) => id !== null)
        .map(nameOf)
        .join(" · "),
    })),
    ...items.map((item) => ({
      kind: "item" as const,
      id: `item:${item.id}`,
      item,
      keys: [keySchema.partitionKey, keySchema.sortKey]
        .flatMap((id) => (id !== null && item.keys[id] ? [item.keys[id]] : []))
        .join(" · "),
    })),
  ];
};
