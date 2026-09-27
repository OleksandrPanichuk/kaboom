import { type DesignOp, migrateGraph, type NodeKind } from "@repo/design";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/features/auth";
import {
  type DesignLayoutPositions,
  designQuery,
  designsListKey,
  saveDesignLayout,
  sendDesignOps,
} from "@/features/designs/api";
import {
  type DesignSnapshot,
  DesignWriter,
  type DesignWriterState,
  newNode,
} from "@/features/designs/utils";
import { ApiRequestError } from "@/lib/api";

const LAYOUT_SAVE_DELAY_MS = 500;

export interface DesignEditor extends DesignWriterState {
  layout: DesignLayoutPositions;
  apply: (ops: DesignOp[]) => string | null;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  moveNodes: (positions: DesignLayoutPositions) => void;
  dismissError: () => void;
}

export const useDesignEditor = (designId: string): DesignEditor => {
  const client = useQueryClient();
  const { data: design } = useSuspenseQuery(designQuery(designId));
  const queryKey = designQuery(designId).queryKey;

  const [state, setState] = useState<DesignWriterState>(() => ({
    graph: migrateGraph(design.graph),
    revision: design.revision,
    saving: false,
    error: null,
  }));

  const [writer] = useState(
    () =>
      new DesignWriter(
        { revision: design.revision, graph: migrateGraph(design.graph) },
        {
          send: async (baseRevision, ops) => {
            try {
              const applied = await sendDesignOps(designId, baseRevision, ops);

              return {
                ok: true,
                snapshot: {
                  revision: applied.revision,
                  graph: migrateGraph(applied.graph),
                },
              };
            } catch (error) {
              if (error instanceof ApiRequestError && error.status === 409) {
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
      await saveDesignLayout(designId, kept);
      client.setQueryData(queryKey, (old) =>
        old ? { ...old, layout: kept } : old,
      );
      setLayoutError(null);
    } catch (error) {
      setLayoutError(`The layout was not saved. ${errorMessage(error)}`);
    } finally {
      setLayoutSaving(dirtyRef.current);
    }
  }, [client, designId, queryKey, writer]);

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
    dismissError,
  };
};
