import type { EdgeKind, EdgeProps, NodeKind } from "../../catalogue";
import {
  createEdge,
  createGroup,
  createNode,
  type DesignGraph,
  type DesignGroup,
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
  groups: DesignGroup[] = [],
): DesignGraph => ({ ...emptyGraph(), nodes, edges, groups });

export const region = (id: string, label: string): DesignGroup =>
  createGroup({ id, kind: "region", label });

export const within = (groupId: string, placed: DesignNode): DesignNode => ({
  ...placed,
  groupId,
});
