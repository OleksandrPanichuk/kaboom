import type { Fault } from "@repo/design";

export type FaultKind = Fault["kind"];

export interface FaultDraft {
  key: string;
  kind: FaultKind;
  targetId: string;
  at: number;
  until: number | null;
  factor: number;
  addMs: number;
}

export interface SpikeDraft {
  enabled: boolean;
  multiplier: number;
  at: number;
  until: number | null;
}

export interface ScenarioDraft {
  durationSeconds: number;
  spike: SpikeDraft;
  faults: FaultDraft[];
  sloP99Ms: number;
  sloAvailability: number;
}

export type HeatTone = "idle" | "ok" | "busy" | "saturated" | "down";
