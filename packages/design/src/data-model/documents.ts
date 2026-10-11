import { type DocumentField, fieldAt } from "../catalogue";
import type { DesignEdge, DesignGraph, NodeFor } from "../graph";

export type CollectionNode = NodeFor<"collection">;

export interface ResolvedReference {
  edge: DesignEdge;
  from: CollectionNode;
  to: CollectionNode;
  field: DocumentField;
  path: string[];
  many: boolean;
}

export const collectionsOf = (graph: DesignGraph): CollectionNode[] =>
  graph.nodes.filter(
    (node): node is CollectionNode => node.kind === "collection",
  );

export const collectionName = (collection: CollectionNode): string =>
  collection.label || collection.id;

export const referencesOf = (graph: DesignGraph): ResolvedReference[] => {
  const collections = new Map(
    collectionsOf(graph).map((collection) => [collection.id, collection]),
  );

  return graph.edges.flatMap((edge) => {
    const from = collections.get(edge.from);
    const to = collections.get(edge.to);
    const path = edge.reference?.fromField;

    if (edge.kind !== "reference" || !from || !to || !path) return [];

    const field = fieldAt(from.props.fields, path);

    if (!field) return [];

    return [{ edge, from, to, field, path, many: field.type === "array" }];
  });
};

export const pathByNames = (
  fields: readonly DocumentField[],
  dotted: string,
): string[] | null => {
  const ids: string[] = [];
  let level: readonly DocumentField[] = fields;

  for (const name of dotted.split(".")) {
    const field = level.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );

    if (!field) return null;

    ids.push(field.id);
    level = field.fields ?? [];
  }

  return ids;
};

export const pathNames = (
  fields: readonly DocumentField[],
  path: readonly string[],
): string => {
  const names: string[] = [];
  let level: readonly DocumentField[] = fields;

  for (const id of path) {
    const field = level.find((item) => item.id === id);

    names.push(field?.name ?? id);
    level = field?.fields ?? [];
  }

  return names.join(".");
};

export const embedsMany = (field: DocumentField): boolean =>
  field.type === "array" && field.of === "object";
