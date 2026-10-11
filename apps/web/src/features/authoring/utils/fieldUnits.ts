import { type JsonSchema, shapeOf } from "./schemaForm";

export type FieldUnit =
  { kind: "clock" } | { kind: "share" } | { kind: "suffix"; suffix: string };

const CLOCK_KEYS = /^(at|until)$|Seconds$/;

const SUFFIXES: ReadonlyArray<readonly [RegExp, string]> = [
  [/Ms$/, "ms"],
  [/(^m|M)inutes$/, "min"],
  [/Usd$/, "$"],
  [/^(multiplier|factor)$/, "×"],
  [/^perSecond$/, "/s"],
  [/^kb$/, "KB"],
  [/^(weight|cost)$/, "pts"],
];

export const unitOf = (key: string, schema: JsonSchema): FieldUnit | null => {
  const shape = shapeOf(schema);

  if (shape.kind !== "number") return null;

  if (!shape.integer && shape.max === 1) return { kind: "share" };

  const title = typeof schema.title === "string" ? schema.title : "";

  if (CLOCK_KEYS.test(key) || title.endsWith("(s)")) return { kind: "clock" };

  const suffix = SUFFIXES.find(([pattern]) => pattern.test(key))?.[1];

  return suffix ? { kind: "suffix", suffix } : null;
};

const CLOCK = /^(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)$/;

export const formatClock = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Number((seconds % 60).toFixed(3));
  const secondsText = `${rest < 10 ? "0" : ""}${rest}`;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secondsText}`
    : `${minutes}:${secondsText}`;
};

export const parseClock = (text: string): number | null => {
  const match = CLOCK.exec(text.trim());

  if (!match) return null;

  const [, first, second, last] = match;
  const parts = [first, second, last]
    .filter((part): part is string => part !== undefined)
    .map(Number);

  if (parts.length > 1 && parts.slice(1).some((part) => part >= 60)) {
    return null;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
};

export const formatShare = (share: number): string =>
  String(Number((share * 100).toFixed(4)));

export const parseShare = (text: string): number | null => {
  const value = Number(text.trim());

  return text.trim() !== "" && Number.isFinite(value)
    ? Number((value / 100).toFixed(6))
    : null;
};

export const formatWithUnit = (
  value: number,
  unit: FieldUnit | null,
): string => {
  if (unit?.kind === "clock") return formatClock(value);
  if (unit?.kind === "share") return `${formatShare(value)}%`;
  if (!unit) return String(value);
  if (unit.suffix === "$") return `$${value}`;
  if (unit.suffix === "×") return `${value}×`;

  return `${value} ${unit.suffix}`;
};
