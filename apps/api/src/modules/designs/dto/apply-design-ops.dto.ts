import { MAX_OPS_PER_BATCH } from "@repo/design";
import { t } from "elysia";

export const ApplyDesignOpsInput = t.Object({
  baseRevision: t.Integer({ minimum: 0 }),
  ops: t.Array(t.Unknown(), { minItems: 1, maxItems: MAX_OPS_PER_BATCH }),
});
export type ApplyDesignOpsInput = typeof ApplyDesignOpsInput.static;
