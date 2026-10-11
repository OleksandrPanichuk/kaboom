const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const changedFields = (next: unknown, current: unknown): string[] => {
  const after = record(next);
  const before = record(current);

  return [...new Set([...Object.keys(after), ...Object.keys(before)])]
    .filter((key) => JSON.stringify(after[key]) !== JSON.stringify(before[key]))
    .sort();
};
