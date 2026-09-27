import type { EdgeKind, EdgeProps, NodeKind } from "../../catalogue";
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

export const edge = (
  from: string,
  to: string,
  kind: EdgeKind,
  props: Partial<EdgeProps> = {},
) => {
  const created = createEdge({ id: `${from}-${to}-${kind}`, from, to, kind });

  return { ...created, props: { ...created.props, ...props } };
};

export const graph = (
  nodes: DesignNode[],
  edges: Array<ReturnType<typeof edge>> = [],
): DesignGraph => ({ ...emptyGraph(), nodes, edges });
