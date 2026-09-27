import "@xyflow/react/dist/style.css";

import type { DesignGraph } from "@repo/design";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
  ReactFlow,
} from "@xyflow/react";
import { useMemo } from "react";

import type { DesignLayout } from "@/features/canvas/typedefs";
import { toFlow } from "@/features/canvas/utils";

import { CanvasNodeCard } from "./CanvasNodeCard";

const NODE_TYPES: NodeTypes = { "design-node": CanvasNodeCard };

const FIT_VIEW = { padding: 0.15, minZoom: 0.7, maxZoom: 1 };

interface DesignCanvasProps {
  graph: DesignGraph;
  layout: DesignLayout;
  revision: number;
}

export function DesignCanvas({ graph, layout, revision }: DesignCanvasProps) {
  const flow = useMemo(() => toFlow(graph, layout), [graph, layout]);
  const empty = flow.nodes.length === 0;

  return (
    <div className="absolute inset-0">
      <ReactFlow
        key={revision}
        defaultNodes={flow.nodes}
        defaultEdges={flow.edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
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
              This design has no nodes yet
            </p>
            <p className="text-sm leading-5 text-muted-foreground text-pretty">
              Adding and connecting nodes is the next step we are building.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
