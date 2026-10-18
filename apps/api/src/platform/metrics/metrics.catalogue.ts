export type MetricKind = "counter" | "histogram" | "gauge";

export interface MetricDefinition {
  kind: MetricKind;
  name: string;
  unit: string;
  description: string;
  labels: readonly string[];
  buckets?: readonly number[];
}

const SLOW_MS = [
  100, 250, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000, 120000,
] as const;

export const METRICS = {
  httpRequests: {
    kind: "counter",
    name: "http_requests",
    unit: "1",
    description: "HTTP requests answered",
    labels: ["method", "route", "status_class"],
  },
  httpDuration: {
    kind: "histogram",
    name: "http_request_duration",
    unit: "ms",
    description: "Time to answer an HTTP request",
    labels: ["method", "route", "status_class"],
  },
  jobRuns: {
    kind: "counter",
    name: "job_runs",
    unit: "1",
    description: "Background job attempts, by how they ended",
    labels: ["job_name", "queue", "outcome"],
  },
  jobDuration: {
    kind: "histogram",
    name: "job_duration",
    unit: "ms",
    description: "Time a background job attempt took",
    labels: ["job_name", "queue", "outcome"],
    buckets: SLOW_MS,
  },
  llmTurns: {
    kind: "counter",
    name: "llm_turns",
    unit: "1",
    description: "Language model requests, by why they stopped",
    labels: ["role", "stop_reason"],
  },
  llmTurnDuration: {
    kind: "histogram",
    name: "llm_turn_duration",
    unit: "ms",
    description: "Time a language model request took to stop",
    labels: ["role"],
    buckets: SLOW_MS,
  },
  llmFirstToken: {
    kind: "histogram",
    name: "llm_first_token",
    unit: "ms",
    description: "Time to the first text a language model streamed",
    labels: ["role"],
    buckets: SLOW_MS,
  },
  llmTokens: {
    kind: "counter",
    name: "llm_tokens",
    unit: "{token}",
    description: "Tokens a language model read and wrote",
    labels: ["role", "type"],
  },
  llmFailures: {
    kind: "counter",
    name: "llm_failures",
    unit: "1",
    description: "Language model requests that failed rather than stopped",
    labels: ["role", "reason"],
  },
  llmBudgetRefusals: {
    kind: "counter",
    name: "llm_budget_refusals",
    unit: "1",
    description: "Interviewer turns refused because the daily budget is spent",
    labels: [],
  },
  designTests: {
    kind: "counter",
    name: "design_tests",
    unit: "1",
    description: "Design tests asked of the tester, by how they ended",
    labels: ["task", "outcome"],
  },
  designTestDuration: {
    kind: "histogram",
    name: "design_test_duration",
    unit: "ms",
    description: "Time a design test waited and ran",
    labels: ["task"],
    buckets: SLOW_MS,
  },
  designTestWorkerRestarts: {
    kind: "counter",
    name: "design_test_worker_restarts",
    unit: "1",
    description: "Design test workers replaced after dying or being stopped",
    labels: ["reason"],
  },
  designTestQueue: {
    kind: "gauge",
    name: "design_test_queue",
    unit: "{test}",
    description: "Design tests waiting for a worker",
    labels: [],
  },
  billingEventsFailed: {
    kind: "gauge",
    name: "billing_events_failed",
    unit: "{event}",
    description: "Billing events whose last attempt failed",
    labels: [],
  },
  billingOldestPending: {
    kind: "gauge",
    name: "billing_oldest_pending",
    unit: "s",
    description: "Age of the oldest billing event still waiting",
    labels: [],
  },
  productEvents: {
    kind: "counter",
    name: "product_events",
    unit: "1",
    description: "Things people did that the product cares about",
    labels: ["event"],
  },
} as const satisfies Record<string, MetricDefinition>;

export type MetricName = keyof typeof METRICS;

type NamesOf<Kind extends MetricKind> = {
  [Name in MetricName]: (typeof METRICS)[Name]["kind"] extends Kind
    ? Name
    : never;
}[MetricName];

export type CounterName = NamesOf<"counter">;
export type HistogramName = NamesOf<"histogram">;
export type GaugeName = NamesOf<"gauge">;

export type LabelsOf<Name extends MetricName> = Readonly<
  Record<(typeof METRICS)[Name]["labels"][number], string>
>;

export type GaugeReader = () => number | Promise<number>;
