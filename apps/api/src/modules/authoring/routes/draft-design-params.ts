import { t } from "elysia";

export const DraftDesignParams = t.Object({
  id: t.String({ format: "uuid" }),
  part: t.UnionEnum(["baseline", "reference"]),
});
export type DraftDesignParams = typeof DraftDesignParams.static;
