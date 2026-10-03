export const ROLLOUT_PHASES = [
  "rolling",
  "complete",
  "stalled",
  "rolled-back",
] as const;

export type RolloutPhase = (typeof ROLLOUT_PHASES)[number];

export interface RolloutStep {
  phase: RolloutPhase;
  old: number;
  ready: number;
  starting: number;
  failing: number;
  slow: number;
  restarts: number;
}

export interface NodeStep {
  reads: number;
  writes: number;
  rho: number;
  p50: number;
  p99: number;
  ownErrorRate: number;
  errorRate: number;
  up: boolean;
  replicas?: number;
  backlog?: number;
  throttled?: number;
  rollout?: RolloutStep;
}

export interface EdgeStep {
  reads: number;
  writes: number;
  backlog?: number;
}

export interface ClientStep {
  emitted: number;
  served: number;
  availability: number;
  p50: number;
  p99: number;
}

export interface EvaluationStep {
  t: number;
  nodes: Record<string, NodeStep>;
  edges: Record<string, EdgeStep>;
  clients: Record<string, ClientStep>;
}

export const FINDING_KINDS = [
  "saturated",
  "errors",
  "throttled",
  "backlog-growing",
  "slo-breach",
  "rollout-stalled",
  "rolled-back",
  "crash-looping",
  "alert-fired",
  "untested-deploy",
  "unscanned-deploy",
  "blocked-path",
  "exposed-store",
  "exposed-service",
  "open-store",
] as const;

export type FindingKind = (typeof FINDING_KINDS)[number];

export interface Finding {
  target: { type: "node" | "edge" | "graph"; id?: string };
  kind: FindingKind;
  atStep: number;
  message: string;
  data: Record<string, number>;
}

export interface AlertOutcome {
  alertId: string;
  firedAt: number | null;
  scraped: boolean;
}

export interface EvaluationResult {
  steps: EvaluationStep[];
  findings: Finding[];
  alerts: AlertOutcome[];
}

export interface StageTiming {
  id: string;
  start: number;
  end: number;
  failChance: number;
}

export interface PipelineResult {
  leadTimeMinutes: number;
  greenRate: number;
  stages: StageTiming[];
  findings: Finding[];
}

export interface ConnectionCheck {
  edgeId: string;
  allowed: boolean;
  reason: string | null;
}

export interface NetworkResult {
  connections: ConnectionCheck[];
  exposed: string[];
  findings: Finding[];
}
