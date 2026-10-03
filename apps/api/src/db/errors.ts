const UNIQUE_VIOLATION = "23505";

export const isUniqueViolation = (error: unknown): boolean => {
  let current: unknown = error;

  while (typeof current === "object" && current !== null) {
    if ((current as { errno?: unknown }).errno === UNIQUE_VIOLATION)
      return true;
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true;

    current = (current as { cause?: unknown }).cause;
  }

  return false;
};
