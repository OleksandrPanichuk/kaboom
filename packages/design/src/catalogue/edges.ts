import z from "zod";

export const EDGE_KINDS = [
  "sync-call",
  "async-message",
  "read",
  "write",
  "replication",
] as const;

export const EdgeKindSchema = z.enum(EDGE_KINDS);

export type EdgeKind = z.infer<typeof EdgeKindSchema>;

const share = z.number().min(0).max(1);
const fanOut = z.number().positive().max(1_000);
const timeoutMs = z.number().positive().max(600_000);

export const EdgePropsSchema = z.strictObject({
  share: share.default(1),
  fanOut: fanOut.default(1),
  timeoutMs: timeoutMs.default(1_000),
});

export type EdgeProps = z.output<typeof EdgePropsSchema>;

export const EdgePropsPatchSchema = z.strictObject({
  share: share.optional(),
  fanOut: fanOut.optional(),
  timeoutMs: timeoutMs.optional(),
});

export const carriesLoad = (kind: EdgeKind): boolean => kind !== "replication";
