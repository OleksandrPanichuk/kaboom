import z from "zod";

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
] as const;

export const EdgeKindSchema = z.enum(EDGE_KINDS);

export type EdgeKind = z.infer<typeof EdgeKindSchema>;

const share = z.number().min(0).max(1);
const fanOut = z.number().positive().max(1_000);
const timeoutMs = z.number().positive().max(600_000);

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
});

export type EdgeProps = z.output<typeof EdgePropsSchema>;

export const EdgePropsPatchSchema = z.strictObject({
  share: share.optional(),
  fanOut: fanOut.optional(),
  timeoutMs: timeoutMs.optional(),
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
] as const satisfies readonly EdgeKind[];

export const isControlEdge = (kind: EdgeKind): boolean =>
  (CONTROL_EDGE_KINDS as readonly EdgeKind[]).includes(kind);

export const carriesLoad = (kind: EdgeKind): boolean =>
  kind !== "replication" && kind !== "lock" && !isControlEdge(kind);
