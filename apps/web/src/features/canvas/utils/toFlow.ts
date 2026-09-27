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
      data: { node, hits: hitsByNode.get(node.id) ?? NO_HITS },
    };
  });

  const edges = graph.edges.map((edge): CanvasEdge => {
    const kind = EDGE_KIND_STYLES[edge.kind];

    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: "smoothstep",
      label: edge.label || undefined,
      labelStyle: {
        fontSize: 11,
        fontWeight: 500,
        fill: "var(--color-zinc-600)",
      },
      labelBgStyle: { fill: "white", stroke: "var(--color-zinc-200)" },
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 6,
      animated: kind.animated,
      style: kind.style,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: String(kind.style.stroke),
        width: 16,
        height: 16,
      },
      ariaLabel: `${kind.label} from ${edge.from} to ${edge.to}`,
      data: { edge },
    };
  });

  return { nodes, edges };
};
