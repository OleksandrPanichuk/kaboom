const KINDS: Record<string, string> = {
  message: "Said",
  note: "Noted",
  drill: "Drill",
  check: "Check",
};

export const citationKind = (kind: string): string => KINDS[kind] ?? kind;
