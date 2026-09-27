import type { DesignGraph, LintHit } from "@repo/design";
import { MarkerType } from "@xyflow/react";

import {
  EDGE_KIND_STYLES,
  GRID_COLUMNS,
  GRID_SPACING,
} from "@/features/canvas/constants";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasOverlay,
  DesignLayout,
} from "@/features/canvas/typedefs";

export interface Flow {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const gridPosition = (index: number) => ({
  x: (index % GRID_COLUMNS) * GRID_SPACING.x,
  y: Math.floor(index / GRID_COLUMNS) * GRID_SPACING.y,
});

const NO_HITS: LintHit[] = [];

export const toFlow = (
  graph: DesignGraph,
  layout: DesignLayout,
  hits: LintHit[] = NO_HITS,
  overlay: CanvasOverlay | null = null,
): Flow => {
  let unplaced = 0;
  const hitsByNode = new Map<string, LintHit[]>();

  for (const hit of hits) {
    for (const id of hit.nodeIds) {
      hitsByNode.set(id, [...(hitsByNode.get(id) ?? []), hit]);
    }
  }

  const nodes = graph.nodes.map((node): CanvasNode => {
    const position = layout[node.id] ?? gridPosition(unplaced++);

    return {
      id: node.id,
      type: "design-node",
      position,
      data: {
        node,
        hits: hitsByNode.get(node.id) ?? NO_HITS,
        ...(overlay?.nodes[node.id] ? { overlay: overlay.nodes[node.id] } : {}),
      },
    };
  });

  const pairKey = (from: string, to: string) =>
    from < to ? `${from}|${to}` : `${to}|${from}`;
  const lanes = new Map<string, number>();

  for (const edge of graph.edges) {
    const key = pairKey(edge.from, edge.to);

    lanes.set(key, (lanes.get(key) ?? 0) + 1);
  }

  const taken = new Map<string, number>();

  const edges = graph.edges.map((edge): CanvasEdge => {
    const kind = EDGE_KIND_STYLES[edge.kind];
    const key = pairKey(edge.from, edge.to);
    const lane = taken.get(key) ?? 0;

    taken.set(key, lane + 1);

    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: "design-edge",
      label: edge.label || undefined,
      animated: kind.animated,
      style: kind.style,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: String(kind.style.stroke),
        width: 16,
        height: 16,
        markerUnits: "userSpaceOnUse",
      },
      ariaLabel: `${kind.label} from ${edge.from} to ${edge.to}`,
      data: {
        edge,
        lane,
        lanes: lanes.get(key) ?? 1,
        reversed: edge.from > edge.to,
        ...(overlay ? { weight: overlay.edges[edge.id] ?? 0 } : {}),
      },
    };
  });

  return { nodes, edges };
};
