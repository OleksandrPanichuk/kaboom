import type { NodeKind } from "@repo/design";

import type { CanvasNodeType } from "@/features/canvas/typedefs";

const CARDS: Readonly<Partial<Record<NodeKind, CanvasNodeType>>> = {
  table: "table-node",
  collection: "collection-node",
  "dynamo-table": "dynamo-table-node",
};

export const cardOf = (kind: NodeKind): CanvasNodeType =>
  CARDS[kind] ?? "design-node";

export const isWideKind = (kind: NodeKind): boolean =>
  cardOf(kind) !== "design-node";
