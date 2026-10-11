import type {
  DynamoIndex,
  DynamoProjection,
  ItemAttribute,
  ItemType,
} from "../catalogue";
import type { DesignGraph, NodeFor } from "../graph";

export type DynamoTableNode = NodeFor<"dynamo-table">;

export interface KeySource {
  name: string;
  kind: "table" | DynamoIndex["kind"];
  partitionKey: string;
  sortKey: string | null;
  projection: DynamoProjection;
  include: string[];
}

export interface ResolvedItem {
  table: DynamoTableNode;
  item: ItemType;
}

export const dynamoTablesOf = (graph: DesignGraph): DynamoTableNode[] =>
  graph.nodes.filter(
    (node): node is DynamoTableNode => node.kind === "dynamo-table",
  );

export const dynamoTableName = (table: DynamoTableNode): string =>
  table.label || table.id;

export const keyAttributeName = (table: DynamoTableNode, id: string): string =>
  table.props.keySchema.attributes.find((attribute) => attribute.id === id)
    ?.name ?? id;

export const keySources = (table: DynamoTableNode): KeySource[] => {
  const { partitionKey, sortKey } = table.props.keySchema;

  return [
    ...(partitionKey === null
      ? []
      : [
          {
            name: "the table",
            kind: "table" as const,
            partitionKey,
            sortKey,
            projection: "all" as const,
            include: [],
          },
        ]),
    ...table.props.indexes.map((index) => ({
      name: index.name,
      kind: index.kind,
      partitionKey: index.partitionKey,
      sortKey: index.sortKey,
      projection: index.projection,
      include: index.include ?? [],
    })),
  ];
};

export const findItem = (
  graph: DesignGraph,
  name: string,
): ResolvedItem | null => {
  for (const table of dynamoTablesOf(graph)) {
    const item = table.props.items.find(
      (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
    );

    if (item) return { table, item };
  }

  return null;
};

export const itemAttribute = (
  item: ItemType,
  name: string,
): ItemAttribute | undefined =>
  item.attributes.find(
    (attribute) => attribute.name.toLowerCase() === name.toLowerCase(),
  );
