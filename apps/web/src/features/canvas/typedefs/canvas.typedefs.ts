import type { DesignEdge, DesignNode, LintHit } from "@repo/design";
import type { Edge, Node } from "@xyflow/react";

export interface CanvasConnection {
  from: string;
  to: string;
  fromHandle: string | null;
  toHandle: string | null;
}

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
  foreignKeys?: string[];
};

export type CanvasNodeType = "design-node" | "table-node";

export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>;

export type RelationCardinality = "one-to-one" | "many-to-one";

export type CanvasEdgeData = Record<string, unknown> & {
  edge: DesignEdge;
  lane: number;
  lanes: number;
  reversed: boolean;
  weight?: number;
  cardinality?: RelationCardinality;
};

export type CanvasEdge = Edge<CanvasEdgeData, "design-edge">;
