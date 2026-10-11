import {
  catalogue,
  ENGINE_FAMILIES,
  type EngineFamily,
  type NodeKind,
} from "../../catalogue";
import type { DesignGraph, DesignGroup, DesignNode } from "../../graph";
import { reject } from "../rejection";
import { homeOf, STORES } from "./placement";

export type DocumentKind = "system" | "schema";

const HOLDERS = new Set<NodeKind>(Object.values(STORES));

export const holdsSchema = (kind: NodeKind): boolean => HOLDERS.has(kind);

export const assertSchemaHolder = (node: DesignNode): void => {
  if (node.schema !== undefined && !holdsSchema(node.kind)) {
    reject(
      "invalid-op",
      `${node.label || node.id} is a ${catalogue[node.kind].label.toLowerCase()}; only a SQL or NoSQL database names a schema`,
    );
  }
};

export const assertInDocument = (
  kind: DocumentKind,
  item: { node: DesignNode } | { group: DesignGroup },
): void => {
  if (kind !== "schema") return;

  if ("node" in item && homeOf(item.node.kind) === undefined) {
    reject(
      "invalid-op",
      `A schema holds tables, collections and DynamoDB tables, not a ${catalogue[item.node.kind].label.toLowerCase()}; draw it in a system`,
    );
  }

  if ("group" in item && item.group.kind !== "database") {
    reject(
      "invalid-op",
      `A schema holds databases, not a ${item.group.kind}; draw it in a system`,
    );
  }
};

export const schemaFamilies = (graph: DesignGraph): Set<EngineFamily> => {
  const families = new Set<EngineFamily>();

  for (const group of graph.groups) {
    if (group.kind === "database" && group.engine !== undefined) {
      families.add(ENGINE_FAMILIES[group.engine]);
    }
  }

  for (const node of graph.nodes) {
    const home = homeOf(node.kind);

    if (home && node.groupId === null) families.add(home.family);
  }

  return families;
};

export const schemaRefusal = (
  kind: NodeKind,
  schema: DesignGraph,
): string | null => {
  if (!holdsSchema(kind)) {
    return `A ${catalogue[kind].label.toLowerCase()} does not hold a schema`;
  }

  const wrong = [...schemaFamilies(schema)].filter(
    (family) => STORES[family] !== kind,
  );

  return wrong.length === 0
    ? null
    : `A ${catalogue[kind].label.toLowerCase()} cannot hold ${wrong.join(" or ")} data; pick a schema of its own family`;
};
