import { type Finding, type LintHit, runLints } from "@repo/design";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import {
  ListChecks,
  Play,
  Redo2,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/features/auth";
import {
  type CanvasFocus,
  CanvasNotice,
  CanvasProvider,
  DesignCanvas,
  NodePalette,
} from "@/features/canvas";
import { designQuery } from "@/features/designs/api";
import {
  type DesignTransport,
  useDesignEditor,
  useHistoryShortcuts,
} from "@/features/designs/hooks";
import {
  ChecksPanel,
  EdgeInspector,
  InspectorEmpty,
  NodeInspector,
  RegionInspector,
  SelectionInspector,
} from "@/features/properties";
import {
  type WorkspaceBackLink,
  WorkspaceLayout,
  type WorkspaceTab,
} from "@/features/shell";
import {
  DEFAULT_SCENARIO,
  overlayAt,
  RunPanel,
  saveRunMutation,
  type ScenarioDraft,
  useSimulation,
} from "@/features/simulation";

export interface DesignWorkspaceContext {
  revision: number;
  saving: boolean;
  showTab: (id: string) => void;
  focusNodes: (nodeIds: string[]) => void;
  resync: () => Promise<void>;
}

interface DesignWorkspaceProps {
  designId: string;
  back: WorkspaceBackLink;
  title?: string;
  actions?: (context: DesignWorkspaceContext) => ReactNode;
  leadingTabs?: (context: DesignWorkspaceContext) => WorkspaceTab[];
  simulation?: boolean;
  initialTab?: string;
  transport?: DesignTransport;
  readOnly?: boolean;
}

interface Selection {
  nodes: string[];
  edges: string[];
}

const NOTHING: Selection = { nodes: [], edges: [] };

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export function DesignWorkspace({
  designId,
  back,
  title,
  actions,
  leadingTabs,
  simulation: withSimulation = true,
  initialTab = "node",
  transport,
  readOnly = false,
}: DesignWorkspaceProps) {
  const { data: design } = useSuspenseQuery(designQuery(designId));
  const editor = useDesignEditor(designId, transport);
  const [selection, setSelection] = useState<Selection>(NOTHING);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [tab, setTab] = useState(initialTab);
  const [focus, setFocus] = useState<CanvasFocus | null>(null);
  const context: DesignWorkspaceContext = {
    revision: editor.revision,
    saving: editor.saving,
    showTab: setTab,
    focusNodes: (nodeIds) =>
      setFocus((current) => ({ nodeIds, token: (current?.token ?? 0) + 1 })),
    resync: editor.resync,
  };
  const focusingRef = useRef(false);
  const hits = useMemo(() => runLints(editor.graph), [editor.graph]);
  const [draft, setDraft] = useState<ScenarioDraft>(DEFAULT_SCENARIO);
  const [stepIndex, setStepIndex] = useState(0);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const running = withSimulation && tab === "run";
  const simulation = useSimulation(editor.graph, draft, running);
  const steps = simulation.result?.steps.length ?? 0;
  const step = Math.min(stepIndex, Math.max(0, steps - 1));
  const overlay = useMemo(
    () =>
      running && simulation.result
        ? overlayAt(editor.graph, simulation.result.steps[step])
        : null,
    [running, simulation.result, editor.graph, step],
  );
  const saveRun = useMutation(saveRunMutation);

  useHistoryShortcuts(editor.undo, editor.redo);

  const onSelectionChange = useCallback((nodes: string[], edges: string[]) => {
    setSelection((current) =>
      sameIds(current.nodes, nodes) && sameIds(current.edges, edges)
        ? current
        : { nodes, edges },
    );

    if (nodes.length + edges.length > 0) setRegionId(null);

    if (focusingRef.current) {
      focusingRef.current = false;
    } else if (nodes.length + edges.length > 0) {
      setTab("node");
    }
  }, []);

  const showFinding = useCallback(
    (finding: Finding) => {
      const target = finding.target;
      const edge =
        target.type === "edge"
          ? editor.graph.edges.find((item) => item.id === target.id)
          : undefined;
      const nodeIds = edge
        ? [edge.from, edge.to]
        : target.id
          ? [target.id]
          : [];

      setStepIndex(finding.atStep);
      focusingRef.current = true;
      setFocus((current) => ({ nodeIds, token: (current?.token ?? 0) + 1 }));
    },
    [editor.graph],
  );

  const onSaveRun = () =>
    saveRun.mutate(
      { designId, revision: editor.revision, scenario: simulation.scenario },
      {
        onSuccess: (run) =>
          setSavedNote(
            `Saved for revision ${run.revision}, with ${run.findings.length} ${run.findings.length === 1 ? "finding" : "findings"}.`,
          ),
        onError: (error) => setSavedNote(errorMessage(error)),
      },
    );

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

  const regions = graph.groups.filter((group) => group.kind === "region");
  const region = regions.find((group) => group.id === regionId) ?? null;
  const sharedRegion = selectedNodes.every(
    (node) => node.groupId === selectedNodes[0]?.groupId,
  )
    ? (selectedNodes[0]?.groupId ?? null)
    : null;
  const selectRegion = (id: string | null) => {
    setRegionId(id);
    if (id) setTab("node");
  };

  const [onlyNode] = selectedNodes;
  const [onlyEdge] = selectedEdges;
  const inspector =
    region && selectedNodes.length + selectedEdges.length === 0 ? (
      <RegionInspector
        key={region.id}
        region={region}
        members={graph.nodes
          .filter((node) => node.groupId === region.id)
          .map((node) => labelOf(node.id))}
        onRename={(label) => editor.renameRegion(region.id, label)}
        onDissolve={() => {
          editor.dissolveRegion(region.id);
          setRegionId(null);
        }}
      />
    ) : onlyNode && selectedNodes.length === 1 && selectedEdges.length === 0 ? (
      <NodeInspector
        key={onlyNode.id}
        node={onlyNode}
        hits={hits.filter((hit) => hit.nodeIds.includes(onlyNode.id))}
        replicas={graph.edges
          .filter(
            (edge) => edge.kind === "replication" && edge.from === onlyNode.id,
          )
          .map((edge) => labelOf(edge.to))}
        regions={regions}
        onRegionChange={(target) => editor.placeInRegion([onlyNode.id], target)}
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
        regions={regions}
        region={sharedRegion}
        onRegionChange={(target) =>
          editor.placeInRegion(
            selectedNodes.map((node) => node.id),
            target,
          )
        }
        onDelete={removeSelection}
      />
    ) : (
      <InspectorEmpty />
    );

  return (
    <CanvasProvider>
      <WorkspaceLayout
        back={back}
        title={title ?? design.name}
        meta={
          <span aria-live="polite">
            Revision {editor.revision}
            {editor.saving ? " · Saving…" : ""}
          </span>
        }
        actions={
          <div className="flex items-center gap-1">
            {actions?.(context)}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Undo"
              title="Undo (⌘Z)"
              className={cn(actions && "max-sm:hidden")}
              disabled={readOnly || !editor.canUndo}
              onClick={editor.undo}
            >
              <Undo2 aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
              className={cn(actions && "max-sm:hidden")}
              disabled={readOnly || !editor.canRedo}
              onClick={editor.redo}
            >
              <Redo2 aria-hidden="true" />
            </Button>
          </div>
        }
        tool={{
          label: "Nodes",
          content: readOnly ? (
            <p className="p-4 text-sm leading-5 text-muted-foreground text-pretty">
              This design is locked: it was submitted and can no longer change.
            </p>
          ) : (
            <NodePalette onAdd={editor.addNode} />
          ),
        }}
        tabsLabel="Inspector"
        tab={tab}
        onTabChange={setTab}
        tabs={[
          ...(leadingTabs?.(context) ?? []),
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
          ...(withSimulation
            ? [
                {
                  id: "run",
                  label: "Run",
                  icon: Play,
                  content: simulation.result ? (
                    <RunPanel
                      graph={editor.graph}
                      draft={draft}
                      onDraftChange={(next) => {
                        setDraft(next);
                        setSavedNote(null);
                      }}
                      scenario={simulation.scenario}
                      result={simulation.result}
                      step={step}
                      onStepChange={setStepIndex}
                      onShowFinding={showFinding}
                      save={{
                        disabled: editor.saving,
                        pending: saveRun.isPending,
                        note: savedNote,
                        onSave: onSaveRun,
                      }}
                    />
                  ) : null,
                },
              ]
            : []),
        ]}
      >
        <DesignCanvas
          graph={editor.graph}
          layout={editor.layout}
          hits={hits}
          overlay={overlay}
          focus={focus}
          onAddNode={editor.addNode}
          onMoveNodes={editor.moveNodes}
          connectionError={editor.connectionError}
          onConnect={editor.connect}
          onRefuseConnection={editor.reportError}
          onDelete={editor.remove}
          onSelectionChange={onSelectionChange}
          readOnly={readOnly}
          selectedRegionId={region?.id ?? null}
          onSelectRegion={selectRegion}
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
