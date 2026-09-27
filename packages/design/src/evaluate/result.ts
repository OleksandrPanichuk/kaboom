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

export type FindingKind =
  "saturated" | "errors" | "backlog-growing" | "slo-breach";

export interface Finding {
  target: { type: "node" | "edge" | "graph"; id?: string };
  kind: FindingKind;
  atStep: number;
  message: string;
  data: Record<string, number>;
}

export interface EvaluationResult {
  steps: EvaluationStep[];
  findings: Finding[];
}
