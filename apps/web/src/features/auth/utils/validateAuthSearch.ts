import type { AuthSearch } from "@/features/auth/typedefs";

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

export const validateAuthSearch = (
  search: Record<string, unknown>,
): AuthSearch => {
  const redirect = text(search.redirect);
  const error = text(search.error);

  return {
    ...(redirect ? { redirect } : {}),
    ...(error ? { error } : {}),
  };
};
