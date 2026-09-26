export interface TokenSearch {
  token?: string;
}

export const validateTokenSearch = (
  search: Record<string, unknown>,
): TokenSearch =>
  typeof search.token === "string" && search.token !== ""
    ? { token: search.token }
    : {};
