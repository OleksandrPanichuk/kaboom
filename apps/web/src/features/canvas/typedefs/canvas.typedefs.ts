import type { DesignEdge, DesignNode } from "@repo/design";
import type { Edge, Node } from "@xyflow/react";

export type DesignLayout = Record<string, { x: number; y: number }>;

export type CanvasNodeData = Record<string, unknown> & { node: DesignNode };

export type CanvasNode = Node<CanvasNodeData, "design-node">;

export type CanvasEdgeData = Record<string, unknown> & { edge: DesignEdge };

export type CanvasEdge = Edge<CanvasEdgeData>;
