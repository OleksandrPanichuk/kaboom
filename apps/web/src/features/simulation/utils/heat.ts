import type { NodeStep } from "@repo/design";

import type { HeatTone } from "@/features/simulation/typedefs";

const BUSY = 0.7;
const SATURATED = 0.95;
const TURNING_AWAY = 0.01;

export const turnedAway = (step: NodeStep): number => {
  const load = step.reads + step.writes;

  return load > 0 && (step.throttled ?? 0) / load > TURNING_AWAY
    ? (step.throttled ?? 0)
    : 0;
};

export const heatOf = (step: NodeStep | undefined): HeatTone => {
  if (!step) return "idle";
  if (!step.up) return "down";
  if (step.reads + step.writes === 0) return "idle";
  if (step.rho >= SATURATED) return "saturated";
  if (step.rho >= BUSY || turnedAway(step) > 0) return "busy";

  return "ok";
};

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatRate = (value: number): string =>
  `${compact.format(value)}/s`;

export const formatShare = (value: number): string =>
  Number.isFinite(value) ? `${Math.round(value * 100)}%` : "∞";

export const formatMs = (value: number): string =>
  value >= 1_000
    ? `${(value / 1_000).toFixed(1)} s`
    : `${Math.round(value)} ms`;

export const formatClock = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${minutes}:${String(rest).padStart(2, "0")}`;
};
