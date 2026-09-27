import type { DesignEdge, DesignNode, LintHit } from "@repo/design";
import type { Edge, Node } from "@xyflow/react";

export type DesignLayout = Record<string, { x: number; y: number }>;

export type OverlayTone = "idle" | "ok" | "busy" | "saturated" | "down";

export interface NodeOverlay {
  tone: OverlayTone;
  text: string;
}

export interface CanvasOverlay {
  nodes: Record<string, NodeOverlay>;
  edges: Record<string, number>;
}

export type CanvasNodeData = Record<string, unknown> & {
  node: DesignNode;
  hits: LintHit[];
  overlay?: NodeOverlay;
};

export type CanvasNode = Node<CanvasNodeData, "design-node">;

export type CanvasEdgeData = Record<string, unknown> & {
  edge: DesignEdge;
  lane: number;
  lanes: number;
  reversed: boolean;
  weight?: number;
};

export type CanvasEdge = Edge<CanvasEdgeData, "design-edge">;
