import { type LintHit, runLints } from "@repo/design";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ListChecks,
  Play,
  Redo2,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  type CanvasFocus,
  CanvasNotice,
  CanvasProvider,
  DesignCanvas,
  NodePalette,
} from "@/features/canvas";
import { designQuery } from "@/features/designs/api";
import { useDesignEditor, useHistoryShortcuts } from "@/features/designs/hooks";
import { PanelPlaceholder } from "@/features/designs/ui/components";
import {
  ChecksPanel,
  EdgeInspector,
  InspectorEmpty,
  NodeInspector,
  SelectionInspector,
} from "@/features/properties";
import { WorkspaceLayout } from "@/features/shell";

interface DesignViewProps {
  designId: string;
}

interface Selection {
  nodes: string[];
  edges: string[];
}

const NOTHING: Selection = { nodes: [], edges: [] };

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export function DesignView({ designId }: DesignViewProps) {
  const { data: design } = useSuspenseQuery(designQuery(designId));
  const editor = useDesignEditor(designId);
  const [selection, setSelection] = useState<Selection>(NOTHING);
  const [tab, setTab] = useState("node");
  const [focus, setFocus] = useState<CanvasFocus | null>(null);
  const focusingRef = useRef(false);
  const hits = useMemo(() => runLints(editor.graph), [editor.graph]);

  useHistoryShortcuts(editor.undo, editor.redo);

  const onSelectionChange = useCallback((nodes: string[], edges: string[]) => {
    setSelection((current) =>
      sameIds(current.nodes, nodes) && sameIds(current.edges, edges)
        ? current
        : { nodes, edges },
    );

    if (focusingRef.current) {
      focusingRef.current = false;
    } else if (nodes.length + edges.length > 0) {
      setTab("node");
    }
  }, []);

  const showHit = useCallback((hit: LintHit) => {
    focusingRef.current = true;
    setFocus((current) => ({
      nodeIds: hit.nodeIds,
      token: (current?.token ?? 0) + 1,
    }));
  }, []);

  const { graph } = editor;
  const selectedNodes = graph.nodes.filter((node) =>
    selection.nodes.includes(node.id),
  );
  const selectedEdges = graph.edges.filter((edge) =>
    selection.edges.includes(edge.id),
  );
  const labelOf = (id: string) =>
    graph.nodes.find((node) => node.id === id)?.label ?? id;
  const removeSelection = () =>
    editor.remove(
      selectedNodes.map((node) => node.id),
      selectedEdges.map((edge) => edge.id),
    );

  const [onlyNode] = selectedNodes;
  const [onlyEdge] = selectedEdges;
  const inspector =
    onlyNode && selectedNodes.length === 1 && selectedEdges.length === 0 ? (
      <NodeInspector
        key={onlyNode.id}
        node={onlyNode}
        hits={hits.filter((hit) => hit.nodeIds.includes(onlyNode.id))}
        onPatch={(patch) => editor.updateNode(onlyNode.id, patch)}
        onDelete={removeSelection}
      />
    ) : onlyEdge && selectedEdges.length === 1 && selectedNodes.length === 0 ? (
      <EdgeInspector
        key={onlyEdge.id}
        edge={onlyEdge}
        onPatch={(patch) => editor.updateEdge(onlyEdge.id, patch)}
        fromLabel={labelOf(onlyEdge.from)}
        toLabel={labelOf(onlyEdge.to)}
        onDelete={removeSelection}
      />
    ) : selectedNodes.length + selectedEdges.length > 1 ? (
      <SelectionInspector
        nodes={selectedNodes.length}
        edges={selectedEdges.length}
        onDelete={removeSelection}
      />
    ) : (
      <InspectorEmpty />
    );

  return (
    <CanvasProvider>
      <WorkspaceLayout
        back={{ to: "/designs", label: "Designs" }}
        title={design.name}
        meta={
          <span aria-live="polite">
            Revision {editor.revision}
            {editor.saving ? " · Saving…" : ""}
          </span>
        }
        actions={
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Undo"
              title="Undo (⌘Z)"
              disabled={!editor.canUndo}
              onClick={editor.undo}
            >
              <Undo2 aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
              disabled={!editor.canRedo}
              onClick={editor.redo}
            >
              <Redo2 aria-hidden="true" />
            </Button>
          </div>
        }
        tool={{
          label: "Nodes",
          content: <NodePalette onAdd={editor.addNode} />,
        }}
        tabsLabel="Inspector"
        tab={tab}
        onTabChange={setTab}
        tabs={[
          {
            id: "node",
            label: "Node",
            icon: SlidersHorizontal,
            content: inspector,
          },
          {
            id: "checks",
            label: "Checks",
            icon: ListChecks,
            badge: hits.length,
            content: <ChecksPanel hits={hits} onShow={showHit} />,
          },
          {
            id: "run",
            label: "Run",
            icon: Play,
            content: (
              <PanelPlaceholder
                icon={Play}
                title="No runs yet"
                description="Run the design under load to see where it bends and where it breaks."
              />
            ),
          },
        ]}
      >
        <DesignCanvas
          graph={editor.graph}
          layout={editor.layout}
          hits={hits}
          focus={focus}
          onAddNode={editor.addNode}
          onMoveNodes={editor.moveNodes}
          connectionError={editor.connectionError}
          onConnect={editor.connect}
          onRefuseConnection={editor.reportError}
          onDelete={editor.remove}
          onSelectionChange={onSelectionChange}
        />
        {editor.error ? (
          <CanvasNotice
            message={editor.error}
            onDismiss={editor.dismissError}
          />
        ) : null}
      </WorkspaceLayout>
    </CanvasProvider>
  );
}
