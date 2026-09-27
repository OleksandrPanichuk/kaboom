import type { FaultKind, ScenarioDraft } from "@/features/simulation/typedefs";

export const STEP_SECONDS = 10;

export const DURATIONS = [
  { seconds: 300, label: "5 minutes" },
  { seconds: 600, label: "10 minutes" },
  { seconds: 1_800, label: "30 minutes" },
] as const;

export const FAULT_KINDS: ReadonlyArray<{
  kind: FaultKind;
  label: string;
  description: string;
}> = [
  {
    kind: "node-down",
    label: "Node down",
    description: "The node stops; a SQL primary may fail over to a replica.",
  },
  {
    kind: "capacity",
    label: "Capacity drop",
    description: "The node serves only a fraction of its capacity.",
  },
  {
    kind: "latency",
    label: "Slow node",
    description: "Every request through the node takes longer.",
  },
  {
    kind: "region-down",
    label: "Region down",
    description:
      "Every node in the region stops; DNS moves users once their cached answer expires.",
  },
  {
    kind: "cache-flush",
    label: "Cache flush",
    description: "The hit ratio falls to zero and recovers over a minute.",
  },
];

export const FLUSHABLE_KINDS = new Set(["cache", "cdn"]);

export const DEFAULT_SCENARIO: ScenarioDraft = {
  durationSeconds: 600,
  spike: { enabled: false, multiplier: 5, at: 120, until: 300 },
  faults: [],
  sloP99Ms: 300,
  sloAvailability: 0.999,
};
