import { type EdgeKind, EdgePropsSchema, type NodeKind } from "../../catalogue";
import {
  createNode,
  type DesignEdge,
  type DesignGraph,
  type DesignNode,
  emptyGraph,
} from "../../graph";

export const node = (
  id: string,
  kind: NodeKind,
  props: Record<string, unknown> = {},
): DesignNode => {
  const created = createNode(kind, { id, label: id });

  return { ...created, props: { ...created.props, ...props } } as DesignNode;
};

export const edge = (
  from: string,
  to: string,
  kind: EdgeKind = "sync-call",
  props: Partial<DesignEdge["props"]> = {},
): DesignEdge => ({
  id: `${from}-${to}-${kind}`,
  from,
  to,
  kind,
  label: "",
  props: { ...EdgePropsSchema.parse({}), ...props },
});

export const graph = (
  nodes: DesignNode[],
  edges: DesignEdge[],
): DesignGraph => ({
  ...emptyGraph(),
  nodes,
  edges,
});
