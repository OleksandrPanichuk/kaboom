import z from "zod";

import { EdgeKindSchema, EdgePropsPatchSchema } from "../catalogue";
import {
  type DesignEdge,
  DesignEdgeSchema,
  type DesignGroup,
  DesignGroupSchema,
  type DesignNode,
  DesignNodeSchema,
  IdSchema,
  type TechnologyRef,
  TechnologyRefSchema,
} from "../graph";

export const MAX_OPS_PER_BATCH = 200;

export interface NodePatch {
  label?: string;
  notes?: string;
  groupId?: string | null;
  props?: Record<string, unknown>;
  technology?: TechnologyRef | null;
}

export interface EdgePatch {
  label?: string;
  kind?: DesignEdge["kind"];
  props?: Partial<DesignEdge["props"]>;
}

export type DesignOp =
  | { op: "add-node"; node: DesignNode }
  | { op: "remove-node"; id: string }
  | { op: "update-node"; id: string; patch: NodePatch }
  | { op: "add-edge"; edge: DesignEdge }
  | { op: "remove-edge"; id: string }
  | { op: "update-edge"; id: string; patch: EdgePatch }
  | { op: "add-group"; group: DesignGroup }
  | { op: "remove-group"; id: string };

export type DesignOpKind = DesignOp["op"];

const NodePatchSchema = z.strictObject({
  label: z.string().max(80).optional(),
  notes: z.string().max(2_000).optional(),
  groupId: IdSchema.nullable().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  technology: TechnologyRefSchema.nullable().optional(),
});

const EdgePatchSchema = z.strictObject({
  label: z.string().max(80).optional(),
  kind: EdgeKindSchema.optional(),
  props: EdgePropsPatchSchema.optional(),
});

export const DesignOpSchema: z.ZodType<DesignOp> = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("add-node"), node: DesignNodeSchema }),
  z.strictObject({ op: z.literal("remove-node"), id: IdSchema }),
  z.strictObject({
    op: z.literal("update-node"),
    id: IdSchema,
    patch: NodePatchSchema,
  }),
  z.strictObject({ op: z.literal("add-edge"), edge: DesignEdgeSchema }),
  z.strictObject({ op: z.literal("remove-edge"), id: IdSchema }),
  z.strictObject({
    op: z.literal("update-edge"),
    id: IdSchema,
    patch: EdgePatchSchema,
  }),
  z.strictObject({ op: z.literal("add-group"), group: DesignGroupSchema }),
  z.strictObject({ op: z.literal("remove-group"), id: IdSchema }),
]);

export const DesignOpBatchSchema = z
  .array(DesignOpSchema)
  .min(1)
  .max(MAX_OPS_PER_BATCH);
