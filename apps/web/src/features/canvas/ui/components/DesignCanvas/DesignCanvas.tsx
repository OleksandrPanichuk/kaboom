import "@xyflow/react/dist/style.css";

import { type DesignGraph, isNodeKind, type NodeKind } from "@repo/design";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import { type DragEvent, useMemo, useState } from "react";

import {
  CANVAS_ELEMENT_ID,
  NODE_HEIGHT,
  NODE_KIND_MIME,
  NODE_WIDTH,
} from "@/features/canvas/constants";
import type {
  CanvasEdge,
  CanvasNode,
  DesignLayout,
} from "@/features/canvas/typedefs";
import { type Flow, mergeFlowNodes, toFlow } from "@/features/canvas/utils";

import { CanvasNodeCard } from "./CanvasNodeCard";

const NODE_TYPES: NodeTypes = { "design-node": CanvasNodeCard };

const FIT_VIEW = { padding: 0.15, minZoom: 0.7, maxZoom: 1 };

interface DesignCanvasProps {
  graph: DesignGraph;
  layout: DesignLayout;
  onAddNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  onMoveNodes: (positions: DesignLayout) => void;
}

export function DesignCanvas({
  graph,
  layout,
  onAddNode,
  onMoveNodes,
}: DesignCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const flow = useMemo(() => toFlow(graph, layout), [graph, layout]);

  const [fitOnOpen] = useState(flow.nodes.length > 0);
  const [synced, setSynced] = useState<Flow>(flow);
  const [nodes, setNodes] = useState<CanvasNode[]>(flow.nodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(flow.edges);

  if (synced !== flow) {
    setSynced(flow);
    setNodes((current) => mergeFlowNodes(current, flow.nodes));
    setEdges((current) => {
      const selected = new Set(
        current.filter((edge) => edge.selected).map((edge) => edge.id),
      );

      return flow.edges.map((edge) =>
        selected.has(edge.id) ? { ...edge, selected: true } : edge,
      );
    });
  }

  const onNodesChange: OnNodesChange<CanvasNode> = (changes) =>
    setNodes((current) => applyNodeChanges(changes, current));

  const onEdgesChange: OnEdgesChange<CanvasEdge> = (changes) =>
    setEdges((current) => applyEdgeChanges(changes, current));

  const onNodeDragStop: OnNodeDrag<CanvasNode> = (_event, _node, dragged) =>
    onMoveNodes(
      Object.fromEntries(dragged.map((node) => [node.id, node.position])),
    );

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes(NODE_KIND_MIME)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    const kind = event.dataTransfer.getData(NODE_KIND_MIME);

    if (!isNodeKind(kind)) return;

    event.preventDefault();

    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });

    onAddNode(kind, {
      x: point.x - NODE_WIDTH / 2,
      y: point.y - NODE_HEIGHT / 2,
    });
  };

  const empty = nodes.length === 0;

  return (
    <div
      id={CANVAS_ELEMENT_ID}
      className="absolute inset-0"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow<CanvasNode, CanvasEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={NODE_TYPES}
        nodesConnectable={false}
        deleteKeyCode={null}
        fitView={fitOnOpen}
        fitViewOptions={FIT_VIEW}
        minZoom={0.2}
        maxZoom={2}
        className="bg-zinc-50"
        aria-label="Design canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="rgba(24,24,27,0.18)"
        />
        <Controls
          showInteractive={false}
          position="bottom-left"
          fitViewOptions={FIT_VIEW}
        />
        {empty ? null : (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            className="!hidden sm:!block"
            nodeColor="var(--color-indigo-200)"
            nodeStrokeColor="var(--color-indigo-400)"
            maskColor="rgba(250,250,250,0.7)"
          />
        )}
      </ReactFlow>
      {empty ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
          <div className="flex max-w-xs flex-col items-center gap-1.5 rounded-2xl border border-black/[0.07] bg-white/90 p-5 text-center shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] backdrop-blur">
            <p className="font-semibold tracking-[-0.02em]">
              Start with a node
            </p>
            <p className="text-sm leading-5 text-muted-foreground text-pretty">
              Drag one from the palette onto the canvas, or click it to place it
              here.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
