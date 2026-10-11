import {
  type DesignGraph,
  engineOf,
  isOneToOne,
  type LintHit,
  referencesOf,
  relationsOf,
} from "@repo/design";
import { MarkerType } from "@xyflow/react";

import {
  EDGE_KIND_STYLES,
  GRID_COLUMNS,
  GRID_SPACING,
  NODE_HEIGHT,
} from "@/features/canvas/constants";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasOverlay,
  DesignLayout,
  RelationCardinality,
} from "@/features/canvas/typedefs";

import { columnHandle } from "./columnHandles";
import { nodeHeight, nodeWidth } from "./nodeSize";

export interface Flow {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const gridPlacements = (
  graph: DesignGraph,
  layout: DesignLayout,
): DesignLayout => {
  const blocks = [null, ...graph.groups.map((group) => group.id)];
  const placements: DesignLayout = {};
  const gap = GRID_SPACING.y - NODE_HEIGHT;
  let y = 0;

  for (const block of blocks) {
    const unplaced = graph.nodes.filter(
      (node) =>
        !layout[node.id] &&
        (block === null
          ? !graph.groups.some((group) => group.id === node.groupId)
          : node.groupId === block),
    );

    for (let start = 0; start < unplaced.length; start += GRID_COLUMNS) {
      const row = unplaced.slice(start, start + GRID_COLUMNS);

      row.forEach((node, index) => {
        placements[node.id] = { x: index * GRID_SPACING.x, y };
      });
      y += Math.max(
        GRID_SPACING.y,
        ...row.map((node) => nodeHeight(node) + gap),
      );
    }
  }

  return placements;
};

const NO_HITS: LintHit[] = [];

export const toFlow = (
  graph: DesignGraph,
  layout: DesignLayout,
  hits: LintHit[] = NO_HITS,
  overlay: CanvasOverlay | null = null,
): Flow => {
  const placements = gridPlacements(graph, layout);
  const hitsByNode = new Map<string, LintHit[]>();

  for (const hit of hits) {
    for (const id of hit.nodeIds) {
      hitsByNode.set(id, [...(hitsByNode.get(id) ?? []), hit]);
    }
  }

  const relations = relationsOf(graph);
  const foreignKeys = new Map<string, string[]>();
  const cardinality = new Map<string, RelationCardinality>();
  const optional = new Set<string>();

  for (const relation of relations) {
    foreignKeys.set(relation.from.id, [
      ...(foreignKeys.get(relation.from.id) ?? []),
      relation.foreignKey.id,
    ]);
    cardinality.set(
      relation.edge.id,
      isOneToOne(relation) ? "one-to-one" : "many-to-one",
    );

    if (relation.pairs.some((pair) => pair.from.nullable)) {
      optional.add(relation.edge.id);
    }
  }

  const positionOf = (id: string) => layout[id] ?? placements[id]!;
  const centreOf = (id: string) => {
    const node = graph.nodes.find((item) => item.id === id);

    return positionOf(id).x + (node ? nodeWidth(node) / 2 : 0);
  };

  for (const reference of referencesOf(graph)) {
    foreignKeys.set(reference.from.id, [
      ...(foreignKeys.get(reference.from.id) ?? []),
      reference.path.join("."),
    ]);
    cardinality.set(
      reference.edge.id,
      reference.many ? "one-to-many" : "many-to-one",
    );
  }

  const nodes = graph.nodes.map((node): CanvasNode => {
    const position = positionOf(node.id);

    return {
      id: node.id,
      type:
        node.kind === "table"
          ? "table-node"
          : node.kind === "collection"
            ? "collection-node"
            : node.kind === "dynamo-table"
              ? "dynamo-table-node"
              : "design-node",
      position,
      data: {
        node,
        hits: hitsByNode.get(node.id) ?? NO_HITS,
        ...(node.kind === "collection"
          ? { foreignKeys: foreignKeys.get(node.id) ?? [] }
          : {}),
        ...(node.kind === "table"
          ? {
              foreignKeys: foreignKeys.get(node.id) ?? [],
              engine: engineOf(graph, node),
            }
          : {}),
        ...(overlay?.nodes[node.id] ? { overlay: overlay.nodes[node.id] } : {}),
      },
    };
  });

  const pairKey = (from: string, to: string) =>
    from < to ? `${from}|${to}` : `${to}|${from}`;
  const lanes = new Map<string, number>();

  for (const edge of graph.edges) {
    if (edge.kind === "relation" || edge.kind === "reference") continue;

    const key = pairKey(edge.from, edge.to);

    lanes.set(key, (lanes.get(key) ?? 0) + 1);
  }

  const taken = new Map<string, number>();

  const edges = graph.edges.map((edge): CanvasEdge => {
    const kind = EDGE_KIND_STYLES[edge.kind];
    const marker = {
      type: MarkerType.ArrowClosed,
      color: String(kind.style.stroke),
      width: 16,
      height: 16,
      markerUnits: "userSpaceOnUse",
    };
    const key = pairKey(edge.from, edge.to);
    const relation = edge.relation;
    const reference = edge.reference;
    const joined = relation !== undefined || reference !== undefined;
    const lane = joined ? 0 : (taken.get(key) ?? 0);

    if (!joined) taken.set(key, lane + 1);

    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      ...(reference
        ? (() => {
            const rightward =
              edge.from === edge.to || centreOf(edge.from) <= centreOf(edge.to);

            return {
              sourceHandle: columnHandle(
                reference.fromField.join("."),
                "out",
                rightward ? "right" : "left",
              ),
              targetHandle: columnHandle(
                "_id",
                "in",
                rightward && edge.from !== edge.to ? "left" : "right",
              ),
            };
          })()
        : {}),
      ...(relation
        ? (() => {
            const rightward =
              edge.from === edge.to || centreOf(edge.from) <= centreOf(edge.to);

            return {
              sourceHandle: columnHandle(
                relation.fromColumn,
                "out",
                rightward ? "right" : "left",
              ),
              targetHandle: columnHandle(
                relation.toColumn,
                "in",
                rightward && edge.from !== edge.to ? "left" : "right",
              ),
            };
          })()
        : {}),
      type: "design-edge",
      label: edge.label || undefined,
      animated: kind.animated,
      style: optional.has(edge.id)
        ? { ...kind.style, strokeDasharray: "5 4" }
        : kind.style,
      markerEnd: marker,
      ...(cardinality.get(edge.id) === "one-to-one"
        ? { markerStart: marker }
        : {}),
      ariaLabel: `${kind.label} from ${edge.from} to ${edge.to}`,
      data: {
        edge,
        lane,
        lanes: joined ? 1 : (lanes.get(key) ?? 1),
        reversed: edge.from > edge.to,
        ...(cardinality.has(edge.id)
          ? { cardinality: cardinality.get(edge.id) }
          : {}),
        ...(optional.has(edge.id) ? { optional: true } : {}),
        ...(overlay ? { weight: overlay.edges[edge.id] ?? 0 } : {}),
      },
    };
  });

  return { nodes, edges };
};
