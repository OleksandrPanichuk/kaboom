export const TRIGGERS = [
  "user-message",
  "design-settled",
  "phase-timer",
] as const;

export type Trigger = (typeof TRIGGERS)[number];

export const coalesce = (
  pending: readonly Trigger[],
  next: Trigger,
): Trigger[] => {
  const merged = new Set([...pending, next]);

  if (merged.has("user-message")) merged.delete("design-settled");

  return TRIGGERS.filter((trigger) => merged.has(trigger));
};

export const isUnprompted = (triggers: readonly Trigger[]) =>
  triggers.length > 0 &&
  triggers.every((trigger) => trigger === "design-settled");
