export interface SecuritySearch {
  error?: string;
}

export const validateSecuritySearch = (
  search: Record<string, unknown>,
): SecuritySearch =>
  typeof search.error === "string" && search.error !== ""
    ? { error: search.error }
    : {};
