import z from "zod";

import {
  catalogue,
  EdgeKindSchema,
  type EdgeProps,
  EdgePropsSchema,
  NODE_KINDS,
  type NodeKind,
  type NodeKindDefinition,
  type NodeProps,
} from "../catalogue";

export const DESIGN_GRAPH_SCHEMA_VERSION = 1;

export const MAX_NODES = 500;
export const MAX_EDGES = 2_000;
export const MAX_GROUPS = 100;

export const IdSchema = z.string().min(1).max(64);

const LabelSchema = z.string().max(80);

const NotesSchema = z.string().max(2_000);

export const GROUP_KINDS = ["region"] as const;

export type GroupKind = (typeof GROUP_KINDS)[number];

export interface NodeOf<Kind extends NodeKind> {
  id: string;
  kind: Kind;
  label: string;
  groupId: string | null;
  notes: string;
  props: NodeProps<Kind>;
}

export type DesignNode = { [Kind in NodeKind]: NodeOf<Kind> }[NodeKind];

export type NodeFor<Kind extends NodeKind> = Kind extends NodeKind
  ? NodeOf<Kind>
  : never;

const nodeSchemaFor = (definition: NodeKindDefinition) =>
  z.strictObject({
    id: IdSchema,
    kind: z.literal(definition.kind),
    label: LabelSchema,
    groupId: IdSchema.nullable().default(null),
    notes: NotesSchema.default(""),
    props: definition.props.default(definition.props.parse({})),
  });

export const DesignNodeSchema = z.discriminatedUnion(
  "kind",
  NODE_KINDS.map((kind) => nodeSchemaFor(catalogue[kind])) as [
    ReturnType<typeof nodeSchemaFor>,
    ...Array<ReturnType<typeof nodeSchemaFor>>,
  ],
) as unknown as z.ZodType<DesignNode>;

export interface DesignEdge {
  id: string;
  from: string;
  to: string;
  kind: z.infer<typeof EdgeKindSchema>;
  label: string;
  props: EdgeProps;
}

export const DesignEdgeSchema: z.ZodType<DesignEdge> = z.strictObject({
  id: IdSchema,
  from: IdSchema,
  to: IdSchema,
  kind: EdgeKindSchema,
  label: LabelSchema.default(""),
  props: EdgePropsSchema.default(EdgePropsSchema.parse({})),
});

export interface DesignGroup {
  id: string;
  kind: GroupKind;
  label: string;
  parentId: string | null;
}

export const DesignGroupSchema: z.ZodType<DesignGroup> = z.strictObject({
  id: IdSchema,
  kind: z.enum(GROUP_KINDS),
  label: LabelSchema,
  parentId: IdSchema.nullable().default(null),
});

export interface DesignGraph {
  schemaVersion: typeof DESIGN_GRAPH_SCHEMA_VERSION;
  nodes: DesignNode[];
  edges: DesignEdge[];
  groups: DesignGroup[];
}

export const DesignGraphSchema: z.ZodType<DesignGraph> = z.strictObject({
  schemaVersion: z.literal(DESIGN_GRAPH_SCHEMA_VERSION),
  nodes: z.array(DesignNodeSchema).max(MAX_NODES),
  edges: z.array(DesignEdgeSchema).max(MAX_EDGES),
  groups: z.array(DesignGroupSchema).max(MAX_GROUPS),
});
