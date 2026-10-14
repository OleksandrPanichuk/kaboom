import type { DesignKind, DesignsSearch } from "@/features/designs/typedefs";

const isKind = (value: unknown): value is DesignKind =>
  value === "system" || value === "schema";

export const validateDesignsSearch = (
  search: Record<string, unknown>,
): DesignsSearch => (isKind(search.kind) ? { kind: search.kind } : {});
