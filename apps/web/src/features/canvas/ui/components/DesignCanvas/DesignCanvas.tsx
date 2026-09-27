import "@xyflow/react/dist/style.css";

import {
  type DesignGraph,
  isNodeKind,
  type LintHit,
  type NodeKind,
} from "@repo/design";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  type EdgeTypes,
  type IsValidConnection,
  MiniMap,
  type NodeTypes,
  type OnBeforeDelete,
  type OnConnect,
  type OnConnectEnd,
  type OnConnectStart,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
  type OnSelectionChangeFunc,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import {
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CANVAS_ELEMENT_ID,
  NODE_HEIGHT,
  NODE_KIND_MIME,
  NODE_WIDTH,
} from "@/features/canvas/constants";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasOverlay,
  DesignLayout,
} from "@/features/canvas/typedefs";
import { type Flow, mergeFlowNodes, toFlow } from "@/features/canvas/utils";

import { CanvasEdgePath } from "./CanvasEdgePath";
import { CanvasNodeCard } from "./CanvasNodeCard";
import { RegionLayer } from "./RegionLayer";

const NODE_TYPES: NodeTypes = { "design-node": CanvasNodeCard };

const EDGE_TYPES: EdgeTypes = { "design-edge": CanvasEdgePath };

const FIT_VIEW = { padding: 0.15, minZoom: 0.7, maxZoom: 1 };

const FIT_EVERYTHING = { padding: 0.1, minZoom: 0.2, maxZoom: 1 };

const DELETE_KEYS = ["Backspace", "Delete"];

const MULTI_SELECT_KEYS = ["Shift", "Meta", "Control"];

const CONNECTION_LINE = {
  stroke: "var(--color-indigo-500)",
  strokeWidth: 1.5,
  strokeDasharray: "4 4",
};

export interface CanvasFocus {
  nodeIds: string[];
  token: number;
}

interface DesignCanvasProps {
  graph: DesignGraph;
  layout: DesignLayout;
  hits: LintHit[];
  overlay: CanvasOverlay | null;
  focus: CanvasFocus | null;
  onAddNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  onMoveNodes: (positions: DesignLayout) => void;
  connectionError: (from: string, to: string) => string | null;
  onConnect: (from: string, to: string) => void;
  onRefuseConnection: (reason: string) => void;
  onDelete: (nodeIds: string[], edgeIds: string[]) => void;
  onSelectionChange: (nodeIds: string[], edgeIds: string[]) => void;
  selectedRegionId?: string | null;
  onSelectRegion?: (id: string | null) => void;
  readOnly?: boolean;
}

export function DesignCanvas({
  graph,
  layout,
  hits,
  overlay,
  focus,
  onAddNode,
  onMoveNodes,
  connectionError,
  onConnect,
  onRefuseConnection,
  onDelete,
  onSelectionChange,
  selectedRegionId = null,
  onSelectRegion,
  readOnly = false,
}: DesignCanvasProps) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const flow = useMemo(
    () => toFlow(graph, layout, hits, overlay),
    [graph, layout, hits, overlay],
  );

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

  const [focused, setFocused] = useState(focus?.token ?? null);

  if (focus && focused !== focus.token) {
    setFocused(focus.token);

    const wanted = new Set(focus.nodeIds);

    setNodes((current) =>
      current.map((node) => ({ ...node, selected: wanted.has(node.id) })),
    );
    setEdges((current) =>
      current.map((edge) => ({ ...edge, selected: false })),
    );
  }

  useEffect(() => {
    if (!focus) return;

    void fitView({
      nodes: focus.nodeIds.map((id) => ({ id })),
      duration: 300,
      padding: 0.4,
      maxZoom: 1,
    });
  }, [focus, fitView]);

  const onNodesChange: OnNodesChange<CanvasNode> = (changes) =>
    setNodes((current) => applyNodeChanges(changes, current));

  const onEdgesChange: OnEdgesChange<CanvasEdge> = (changes) =>
    setEdges((current) => applyEdgeChanges(changes, current));

  const onNodeDragStop: OnNodeDrag<CanvasNode> = (_event, _node, dragged) =>
    onMoveNodes(
      Object.fromEntries(dragged.map((node) => [node.id, node.position])),
    );

  const startedAtTarget = useRef(false);

  const oriented = (source: string, target: string): [string, string] =>
    startedAtTarget.current ? [target, source] : [source, target];

  const onConnectStart: OnConnectStart = (_event, { handleType }) => {
    startedAtTarget.current = handleType === "target";
  };

  const isValidConnection: IsValidConnection<CanvasEdge> = ({
    source,
    target,
  }) => connectionError(...oriented(source, target)) === null;

  const connect: OnConnect = ({ source, target }) =>
    onConnect(...oriented(source, target));

  const onConnectEnd: OnConnectEnd = (_event, state) => {
    startedAtTarget.current = false;

    if (state.isValid !== false || !state.fromNode || !state.toNode) return;

    const reason = connectionError(state.fromNode.id, state.toNode.id);

    if (reason) onRefuseConnection(reason);
  };

  const onBeforeDelete: OnBeforeDelete<CanvasNode, CanvasEdge> = ({
    nodes: removed,
    edges: cut,
  }) => {
    onDelete(
      removed.map((node) => node.id),
      cut.map((edge) => edge.id),
    );

    return Promise.resolve(false);
  };

  const selectionChanged = useCallback<
    OnSelectionChangeFunc<CanvasNode, CanvasEdge>
  >(
    ({ nodes: picked, edges: cut }) =>
      onSelectionChange(
        picked.map((node) => node.id),
        cut.map((edge) => edge.id),
      ),
    [onSelectionChange],
  );

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (readOnly || !event.dataTransfer.types.includes(NODE_KIND_MIME)) return;

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
  const regions = graph.groups.filter((group) => group.kind === "region");

  const selectRegion = (id: string) => {
    setNodes((current) =>
      current.map((node) =>
        node.selected ? { ...node, selected: false } : node,
      ),
    );
    setEdges((current) =>
      current.map((edge) =>
        edge.selected ? { ...edge, selected: false } : edge,
      ),
    );
    onSelectRegion?.(id);
  };

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
        edgeTypes={EDGE_TYPES}
        isValidConnection={isValidConnection}
        onConnectStart={onConnectStart}
        onConnect={connect}
        onConnectEnd={onConnectEnd}
        onBeforeDelete={onBeforeDelete}
        onSelectionChange={selectionChanged}
        onPaneClick={() => onSelectRegion?.(null)}
        deleteKeyCode={readOnly ? null : DELETE_KEYS}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        multiSelectionKeyCode={MULTI_SELECT_KEYS}
        connectionLineStyle={CONNECTION_LINE}
        fitView={fitOnOpen}
        fitViewOptions={readOnly ? FIT_EVERYTHING : FIT_VIEW}
        minZoom={0.2}
        maxZoom={2}
        className="design-canvas bg-zinc-50"
        aria-label="Design canvas"
      >
        {regions.length > 0 ? (
          <RegionLayer
            regions={regions}
            selectedId={selectedRegionId}
            onSelect={selectRegion}
          />
        ) : null}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="rgba(24,24,27,0.18)"
        />
        <Controls
          showInteractive={false}
          position="bottom-left"
          fitViewOptions={readOnly ? FIT_EVERYTHING : FIT_VIEW}
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
      {empty && !readOnly ? (
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
