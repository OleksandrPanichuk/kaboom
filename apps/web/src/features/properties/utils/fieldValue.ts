import type { PropControl, PropUnit } from "@repo/design";

type NumberControl = Extract<PropControl, { type: "number" }>;

const PERCENT = 100;

const round = (value: number): number => Math.round(value * 1e6) / 1e6;

export const toDisplay = (value: number, unit: PropUnit | undefined): string =>
  String(unit === "ratio" ? round(value * PERCENT) : value);

export const fromDisplay = (
  text: string,
  unit: PropUnit | undefined,
): number => {
  const trimmed = text.trim();
  const number = trimmed === "" ? Number.NaN : Number(trimmed);

  return unit === "ratio" ? round(number / PERCENT) : number;
};

const shown = (value: number, unit: PropUnit | undefined): string =>
  unit === "ratio" ? `${round(value * PERCENT)}%` : value.toLocaleString("en");

export const checkNumber = (
  value: number,
  control: NumberControl,
  unit: PropUnit | undefined,
): string | null => {
  if (!Number.isFinite(value)) return "Enter a number.";
  if (control.integer && !Number.isInteger(value)) {
    return "Use a whole number.";
  }
  if (control.min !== null && value < control.min) {
    return `Use at least ${shown(control.min, unit)}.`;
  }
  if (control.max !== null && value > control.max) {
    return `Use at most ${shown(control.max, unit)}.`;
  }

  return null;
};

const ACRONYM_LENGTH = 3;

export const optionLabel = (option: string): string => {
  if (option.includes(".")) return option;

  if (option.length <= ACRONYM_LENGTH && /^[a-z0-9]+$/.test(option)) {
    return option.toUpperCase();
  }

  const words = option.replace(/[-_]/g, " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
};
