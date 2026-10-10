import {
  type DesignGraph,
  isOneToOne,
  type LintHit,
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

  for (const relation of relations) {
    foreignKeys.set(relation.from.id, [
      ...(foreignKeys.get(relation.from.id) ?? []),
      relation.foreignKey.id,
    ]);
    cardinality.set(
      relation.edge.id,
      isOneToOne(relation) ? "one-to-one" : "many-to-one",
    );
  }

  const positionOf = (id: string) => layout[id] ?? placements[id]!;
  const centreOf = (id: string) => {
    const node = graph.nodes.find((item) => item.id === id);

    return positionOf(id).x + (node ? nodeWidth(node) / 2 : 0);
  };

  const nodes = graph.nodes.map((node): CanvasNode => {
    const position = positionOf(node.id);

    return {
      id: node.id,
      type: node.kind === "table" ? "table-node" : "design-node",
      position,
      data: {
        node,
        hits: hitsByNode.get(node.id) ?? NO_HITS,
        ...(node.kind === "table"
          ? { foreignKeys: foreignKeys.get(node.id) ?? [] }
          : {}),
        ...(overlay?.nodes[node.id] ? { overlay: overlay.nodes[node.id] } : {}),
      },
    };
  });

  const pairKey = (from: string, to: string) =>
    from < to ? `${from}|${to}` : `${to}|${from}`;
  const lanes = new Map<string, number>();

  for (const edge of graph.edges) {
    if (edge.kind === "relation") continue;

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
    const lane = edge.relation ? 0 : (taken.get(key) ?? 0);
    const relation = edge.relation;

    if (!relation) taken.set(key, lane + 1);

    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
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
      style: kind.style,
      markerEnd: marker,
      ...(cardinality.get(edge.id) === "one-to-one"
        ? { markerStart: marker }
        : {}),
      ariaLabel: `${kind.label} from ${edge.from} to ${edge.to}`,
      data: {
        edge,
        lane,
        lanes: relation ? 1 : (lanes.get(key) ?? 1),
        reversed: edge.from > edge.to,
        ...(cardinality.has(edge.id)
          ? { cardinality: cardinality.get(edge.id) }
          : {}),
        ...(overlay ? { weight: overlay.edges[edge.id] ?? 0 } : {}),
      },
    };
  });

  return { nodes, edges };
};
