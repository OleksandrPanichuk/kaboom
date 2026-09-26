import {
  catalogue,
  type EdgeKind,
  EdgePropsSchema,
  type NodeKind,
} from "../catalogue";
import {
  DESIGN_GRAPH_SCHEMA_VERSION,
  type DesignEdge,
  type DesignGraph,
  type DesignGroup,
  type GroupKind,
  type NodeFor,
} from "./schema";

export const emptyGraph = (): DesignGraph => ({
  schemaVersion: DESIGN_GRAPH_SCHEMA_VERSION,
  nodes: [],
  edges: [],
  groups: [],
});

export interface CreateNodeOptions {
  id: string;
  label?: string;
  groupId?: string | null;
}

export const createNode = <Kind extends NodeKind>(
  kind: Kind,
  { id, label, groupId = null }: CreateNodeOptions,
): NodeFor<Kind> =>
  ({
    id,
    kind,
    label: label ?? catalogue[kind].label,
    groupId,
    notes: "",
    props: catalogue[kind].props.parse({}),
  }) as NodeFor<Kind>;

export interface CreateEdgeOptions {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
}

export const createEdge = ({
  id,
  from,
  to,
  kind,
  label = "",
}: CreateEdgeOptions): DesignEdge => ({
  id,
  from,
  to,
  kind,
  label,
  props: EdgePropsSchema.parse({}),
});

export interface CreateGroupOptions {
  id: string;
  kind: GroupKind;
  label: string;
  parentId?: string | null;
}

export const createGroup = ({
  id,
  kind,
  label,
  parentId = null,
}: CreateGroupOptions): DesignGroup => ({ id, kind, label, parentId });
