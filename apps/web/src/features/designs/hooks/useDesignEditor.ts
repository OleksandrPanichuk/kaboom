import {
  type DesignEdge,
  type DesignOp,
  type EdgePatch,
  EdgePropsSchema,
  migrateGraph,
  type NodeKind,
  type NodePatch,
} from "@repo/design";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/features/auth";
import { type CanvasConnection, columnOfHandle } from "@/features/canvas";
import {
  type DesignLayoutPositions,
  designQuery,
  designsListKey,
  saveDesignLayout,
  sendDesignOps,
} from "@/features/designs/api";
import {
  describeConnectionRefusal,
  type DesignSnapshot,
  DesignWriter,
  type DesignWriterState,
  dissolveRegionOps,
  newNode,
  orientRelation,
  placementOps,
  removalOps,
  suggestEdgeKind,
} from "@/features/designs/utils";
import type { RegionTarget } from "@/features/properties";
import { ApiRequestError } from "@/lib/api";

const LAYOUT_SAVE_DELAY_MS = 500;

export interface DesignTransport {
  sendOps: (
    baseRevision: number,
    ops: DesignOp[],
  ) => Promise<{ revision: number; graph: unknown }>;
  saveLayout: (layout: DesignLayoutPositions) => Promise<unknown>;
}

const designTransport = (designId: string): DesignTransport => ({
  sendOps: (baseRevision, ops) => sendDesignOps(designId, baseRevision, ops),
  saveLayout: (layout) => saveDesignLayout(designId, layout),
});

export interface DesignEditor extends DesignWriterState {
  layout: DesignLayoutPositions;
  apply: (ops: DesignOp[]) => string | null;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  moveNodes: (positions: DesignLayoutPositions) => void;
  connect: (connection: CanvasConnection) => void;
  connectionError: (connection: CanvasConnection) => string | null;
  remove: (nodeIds: string[], edgeIds: string[]) => void;
  updateNode: (id: string, patch: NodePatch) => string | null;
  updateEdge: (id: string, patch: EdgePatch) => string | null;
  placeInRegion: (nodeIds: string[], target: RegionTarget) => void;
  renameRegion: (id: string, label: string) => string | null;
  dissolveRegion: (id: string) => void;
  resync: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  reportError: (message: string) => void;
  dismissError: () => void;
}

export const useDesignEditor = (
  designId: string,
  customTransport?: DesignTransport,
): DesignEditor => {
  const [transport] = useState(
    () => customTransport ?? designTransport(designId),
  );
  const client = useQueryClient();
  const { data: design } = useSuspenseQuery(designQuery(designId));
  const queryKey = designQuery(designId).queryKey;

  const [latest, setState] = useState<DesignWriterState | null>(null);

  const [writer] = useState(
    () =>
      new DesignWriter(
        { revision: design.revision, graph: migrateGraph(design.graph) },
        {
          send: async (baseRevision, ops) => {
            try {
              const applied = await transport.sendOps(baseRevision, ops);

              return {
                ok: true,
                snapshot: {
                  revision: applied.revision,
                  graph: migrateGraph(applied.graph),
                },
              };
            } catch (error) {
              if (
                error instanceof ApiRequestError &&
                error.code === "DESIGN_REVISION_CONFLICT"
              ) {
                return { ok: false, conflict: true };
              }

              return { ok: false, conflict: false, error };
            }
          },
          fetchLatest: async (): Promise<DesignSnapshot> => {
            const latest = await client.fetchQuery({
              ...designQuery(designId),
              staleTime: 0,
            });

            return {
              revision: latest.revision,
              graph: migrateGraph(latest.graph),
            };
          },
          onChange: setState,
          onConfirmed: (snapshot) => {
            client.setQueryData(queryKey, (old) =>
              old
                ? { ...old, revision: snapshot.revision, graph: snapshot.graph }
                : old,
            );
            void client.invalidateQueries({ queryKey: designsListKey });
          },
          describeError: errorMessage,
        },
      ),
  );

  const state = latest ?? writer.state;

  const [layout, setLayout] = useState<DesignLayoutPositions>(design.layout);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const layoutRef = useRef(layout);
  const dirtyRef = useRef(false);

  const saveLayout = useCallback(async () => {
    if (!dirtyRef.current) return;

    dirtyRef.current = false;

    const ids = new Set(writer.state.graph.nodes.map((node) => node.id));
    const kept = Object.fromEntries(
      Object.entries(layoutRef.current).filter(([id]) => ids.has(id)),
    );

    try {
      await transport.saveLayout(kept);
      client.setQueryData(queryKey, (old) =>
        old ? { ...old, layout: kept } : old,
      );
      setLayoutError(null);
    } catch (error) {
      setLayoutError(`The layout was not saved. ${errorMessage(error)}`);
    } finally {
      setLayoutSaving(dirtyRef.current);
    }
  }, [client, queryKey, transport, writer]);

  useEffect(() => {
    if (!dirtyRef.current) return;

    const timer = setTimeout(() => void saveLayout(), LAYOUT_SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [layout, saveLayout]);

  useEffect(() => () => void saveLayout(), [saveLayout]);

  const moveNodes = useCallback((positions: DesignLayoutPositions) => {
    setLayout((current) => {
      const next = { ...current, ...positions };

      layoutRef.current = next;

      return next;
    });
    dirtyRef.current = true;
    setLayoutSaving(true);
  }, []);

  const apply = useCallback((ops: DesignOp[]) => writer.apply(ops), [writer]);

  const addNode = useCallback(
    (kind: NodeKind, position: { x: number; y: number }) => {
      const node = newNode(writer.state.graph, kind);

      if (writer.apply([{ op: "add-node", node }]) === null) {
        moveNodes({ [node.id]: position });
      }
    },
    [moveNodes, writer],
  );

  const edgeOp = useCallback(
    ({
      from,
      to,
      fromHandle,
      toHandle,
    }: CanvasConnection): DesignOp | string => {
      const { graph } = writer.state;
      const source = graph.nodes.find((node) => node.id === from);
      const target = graph.nodes.find((node) => node.id === to);

      if (!source || !target) {
        return "One of those nodes is no longer in the design.";
      }

      if (source.kind === "table" && target.kind === "table") {
        const fromColumn = columnOfHandle(fromHandle);
        const toColumn = columnOfHandle(toHandle);

        if (!fromColumn || !toColumn) {
          return "Draw a relation from a column to the column it references.";
        }

        const oriented = orientRelation(source, fromColumn, target, toColumn);

        return {
          op: "add-edge",
          edge: {
            id: `edge-${crypto.randomUUID().slice(0, 8)}`,
            ...oriented,
            kind: "relation",
            label: "",
            props: EdgePropsSchema.parse({}),
          },
        };
      }

      const edge: DesignEdge = {
        id: `edge-${crypto.randomUUID().slice(0, 8)}`,
        from,
        to,
        kind: suggestEdgeKind(
          source,
          target,
          graph.edges
            .filter((edge) => edge.from === from && edge.to === to)
            .map((edge) => edge.kind),
        ),
        label: "",
        props: EdgePropsSchema.parse({}),
      };

      return { op: "add-edge", edge };
    },
    [writer],
  );

  const connectionError = useCallback(
    (connection: CanvasConnection) => {
      const op = edgeOp(connection);

      if (typeof op === "string") return op;

      const rejection = writer.check([op]);

      return rejection
        ? describeConnectionRefusal(
            writer.state.graph,
            connection.from,
            connection.to,
            rejection,
          )
        : null;
    },
    [edgeOp, writer],
  );

  const connect = useCallback(
    (connection: CanvasConnection) => {
      const op = edgeOp(connection);
      const refused = typeof op === "string" ? op : writer.apply([op]);

      if (refused) writer.reportError(refused);
    },
    [edgeOp, writer],
  );

  const remove = useCallback(
    (nodeIds: string[], edgeIds: string[]) => {
      const ops = removalOps(writer.state.graph, nodeIds, edgeIds);

      if (ops.length === 0) return;

      const refused = writer.apply(ops);

      if (refused) writer.reportError(refused);
    },
    [writer],
  );

  const updateNode = useCallback(
    (id: string, patch: NodePatch) =>
      writer.apply([{ op: "update-node", id, patch }]),
    [writer],
  );

  const updateEdge = useCallback(
    (id: string, patch: EdgePatch) => {
      const ops: DesignOp[] = [{ op: "update-edge", id, patch }];
      const rejection = writer.check(ops);
      const edge = writer.state.graph.edges.find((item) => item.id === id);

      if (rejection) {
        return edge
          ? describeConnectionRefusal(
              writer.state.graph,
              edge.from,
              edge.to,
              rejection,
            )
          : rejection.message;
      }

      return writer.apply(ops);
    },
    [writer],
  );

  const placeInRegion = useCallback(
    (nodeIds: string[], target: RegionTarget) => {
      const ops = placementOps(writer.state.graph, nodeIds, target);
      const refused = ops.length > 0 ? writer.apply(ops) : null;

      if (refused) writer.reportError(refused);
    },
    [writer],
  );

  const renameRegion = useCallback(
    (id: string, label: string) =>
      writer.apply([{ op: "update-group", id, patch: { label } }]),
    [writer],
  );

  const dissolveRegion = useCallback(
    (id: string) => {
      const refused = writer.apply(dissolveRegionOps(writer.state.graph, id));

      if (refused) writer.reportError(refused);
    },
    [writer],
  );

  const reportError = useCallback(
    (message: string) => writer.reportError(message),
    [writer],
  );

  const resync = useCallback(() => writer.resync(), [writer]);

  const undo = useCallback(() => writer.undo(), [writer]);
  const redo = useCallback(() => writer.redo(), [writer]);

  const dismissError = useCallback(() => {
    writer.dismissError();
    setLayoutError(null);
  }, [writer]);

  return {
    ...state,
    saving: state.saving || layoutSaving,
    error: state.error ?? layoutError,
    layout,
    apply,
    addNode,
    moveNodes,
    connect,
    connectionError,
    remove,
    updateNode,
    updateEdge,
    placeInRegion,
    renameRegion,
    dissolveRegion,
    resync,
    undo,
    redo,
    reportError,
    dismissError,
  };
};
