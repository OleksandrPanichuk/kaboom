import z from "zod";

import type { NodeKind } from "./catalogue";
import { prop } from "./prop-meta";

export const EDGE_KINDS = [
  "sync-call",
  "async-message",
  "read",
  "write",
  "replication",
  "change-feed",
  "lock",
  "mounts",
  "scales",
  "watches",
  "scrapes",
  "pipeline-next",
  "publishes",
  "protects",
  "admits",
  "relation",
  "reference",
] as const;

export const EdgeKindSchema = z.enum(EDGE_KINDS);

export type EdgeKind = z.infer<typeof EdgeKindSchema>;

const share = z.number().min(0).max(1);
const fanOut = z.number().positive().max(1_000);
const timeoutMs = z.number().positive().max(600_000);
const retries = z.number().int().min(0).max(5);

export const EdgePropsSchema = z.strictObject({
  share: prop(share.default(1), {
    title: "Share",
    description:
      "Part of the source's outgoing load this edge carries, when the source splits it",
    unit: "ratio",
  }),
  fanOut: prop(fanOut.default(1), {
    title: "Fan-out",
    description:
      "Calls made along this edge for each request the source handles",
    unit: "count",
  }),
  timeoutMs: prop(timeoutMs.default(1_000), {
    title: "Timeout",
    description: "How long the source waits before it gives up on a call",
    unit: "ms",
  }),
  retries: prop(retries.default(0), {
    title: "Retries",
    description:
      "Times the source repeats a call that failed, before it gives up",
    unit: "count",
  }),
});

export type EdgeProps = z.output<typeof EdgePropsSchema>;

export const EdgePropsPatchSchema = z.strictObject({
  share: share.optional(),
  fanOut: fanOut.optional(),
  timeoutMs: timeoutMs.optional(),
  retries: retries.optional(),
});

export const ON_DELETE_ACTIONS = ["restrict", "cascade", "set-null"] as const;

export type OnDeleteAction = (typeof ON_DELETE_ACTIONS)[number];

const columnRef = z.string().min(1).max(64);
const onDelete = z.enum(ON_DELETE_ACTIONS);

export const RelationSchema = z.strictObject({
  fromColumn: columnRef,
  toColumn: columnRef,
  moreColumns: z
    .array(z.strictObject({ fromColumn: columnRef, toColumn: columnRef }))
    .min(1)
    .max(7)
    .optional(),
  onUpdate: onDelete.optional(),
  deferrable: z.literal(true).optional(),
  onDelete: prop(onDelete.default("restrict"), {
    title: "On delete",
    description:
      "What happens to these rows when the row they reference is deleted",
  }),
});

export type Relation = z.output<typeof RelationSchema>;

export const ReferenceSchema = z.strictObject({
  fromField: z.array(z.string().min(1).max(64)).min(1).max(4),
});

export type Reference = z.output<typeof ReferenceSchema>;

export const DEFAULT_POOL_SIZE = 10;
export const MAX_POOL_SIZE = 10_000;

const POOLED_EDGE_KINDS: readonly EdgeKind[] = ["sync-call", "read", "write"];

export const opensConnections = (kind: EdgeKind, target: NodeKind): boolean =>
  POOLED_EDGE_KINDS.includes(kind) &&
  (target === "sql-database" || target === "connection-pooler");

export const ConnectionSchema = z.strictObject({
  poolSize: z.number().int().min(1).max(MAX_POOL_SIZE),
});

export type Connection = z.output<typeof ConnectionSchema>;

export const RelationPatchSchema = z.strictObject({
  onDelete: onDelete.optional(),
  onUpdate: onDelete.nullable().optional(),
  deferrable: z.literal(true).nullable().optional(),
});

export const CONTROL_EDGE_KINDS = [
  "mounts",
  "scales",
  "watches",
  "scrapes",
  "pipeline-next",
  "publishes",
  "protects",
  "admits",
  "relation",
  "reference",
] as const satisfies readonly EdgeKind[];

export const isControlEdge = (kind: EdgeKind): boolean =>
  (CONTROL_EDGE_KINDS as readonly EdgeKind[]).includes(kind);

export const carriesLoad = (kind: EdgeKind): boolean =>
  kind !== "replication" && kind !== "lock" && !isControlEdge(kind);
