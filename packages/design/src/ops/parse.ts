import type { OpRejection } from "./rejection";
import { type DesignOp, DesignOpBatchSchema } from "./schema";

export type ParseOpsResult = { ok: true; ops: DesignOp[] } | OpRejection;

export const parseDesignOps = (input: unknown): ParseOpsResult => {
  const result = DesignOpBatchSchema.safeParse(input);

  if (result.success) return { ok: true, ops: result.data };

  const issue = result.error.issues[0];
  const [first] = issue?.path ?? [];

  return {
    ok: false,
    index: typeof first === "number" ? first : 0,
    reason: "invalid-op",
    message: issue
      ? `${issue.path.join(".") || "ops"}: ${issue.message}`
      : "Invalid operations",
  };
};
