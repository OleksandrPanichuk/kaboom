import {
  catalogue,
  type Connection,
  type EdgeKind,
  EdgePropsSchema,
  type Engine,
  type NodeKind,
  type Reference,
  type Relation,
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
    technology: null,
  }) as NodeFor<Kind>;

export interface CreateEdgeOptions {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  relation?: Relation;
  reference?: Reference;
  connection?: Connection;
}

export const createEdge = ({
  id,
  from,
  to,
  kind,
  label = "",
  relation,
  reference,
  connection,
}: CreateEdgeOptions): DesignEdge => ({
  id,
  from,
  to,
  kind,
  label,
  props: EdgePropsSchema.parse({}),
  ...(relation ? { relation } : {}),
  ...(reference ? { reference } : {}),
  ...(connection ? { connection } : {}),
});

export interface CreateGroupOptions {
  id: string;
  kind: GroupKind;
  label: string;
  parentId?: string | null;
  engine?: Engine;
}

export const createGroup = ({
  id,
  kind,
  label,
  parentId = null,
  engine,
}: CreateGroupOptions): DesignGroup => ({
  id,
  kind,
  label,
  parentId,
  ...(engine ? { engine } : {}),
});
