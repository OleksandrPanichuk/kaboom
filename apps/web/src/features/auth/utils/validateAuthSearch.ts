import type { AuthSearch } from "../typedefs/auth.typedefs";

export const validateAuthSearch = (
  search: Record<string, unknown>,
): AuthSearch =>
  typeof search.redirect === "string" ? { redirect: search.redirect } : {};
