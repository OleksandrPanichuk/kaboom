import type { EdgeKind, NodeKind } from "../../catalogue";
import {
  createEdge,
  createNode,
  type DesignGraph,
  type DesignNode,
  emptyGraph,
} from "../../graph";

export const node = (
  id: string,
  kind: NodeKind,
  label: string,
  props: Record<string, unknown> = {},
): DesignNode => {
  const created = createNode(kind, { id, label });

  return { ...created, props: { ...created.props, ...props } } as DesignNode;
};

export const edge = (from: string, to: string, kind: EdgeKind) =>
  createEdge({ id: `${from}-${to}-${kind}`, from, to, kind });

export const graph = (
  nodes: DesignNode[],
  edges: Array<ReturnType<typeof edge>> = [],
): DesignGraph => ({ ...emptyGraph(), nodes, edges });
