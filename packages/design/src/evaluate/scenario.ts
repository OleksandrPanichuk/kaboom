import z from "zod";

import { IdSchema } from "../graph";

const Seconds = z.number().min(0).max(86_400);

const TrafficPointSchema = z.strictObject({
  at: Seconds,
  multiplier: z.number().min(0).max(1_000),
});

const window = { at: Seconds, until: Seconds.optional() };

export const FaultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("node-down"), nodeId: IdSchema, ...window }),
  z.strictObject({
    kind: z.literal("capacity"),
    nodeId: IdSchema,
    ...window,
    factor: z.number().min(0).max(100),
  }),
  z.strictObject({
    kind: z.literal("latency"),
    nodeId: IdSchema,
    ...window,
    addMs: z.number().min(0).max(600_000),
  }),
  z.strictObject({
    kind: z.literal("region-down"),
    groupId: IdSchema,
    ...window,
  }),
  z.strictObject({
    kind: z.literal("cache-flush"),
    nodeId: IdSchema,
    at: Seconds,
  }),
]);

export type Fault = z.infer<typeof FaultSchema>;

export const SloSchema = z.strictObject({
  p99Ms: z.number().positive().max(600_000),
  availability: z.number().min(0).max(1),
});

export type Slo = z.infer<typeof SloSchema>;

export const LoadScenarioSchema = z.strictObject({
  kind: z.literal("load"),
  stepSeconds: z.number().int().min(1).max(3_600).default(10),
  durationSeconds: z.number().int().min(1).max(86_400).default(600),
  traffic: z.array(TrafficPointSchema).max(100).default([]),
  faults: z.array(FaultSchema).max(100).default([]),
  slo: SloSchema.default({ p99Ms: 300, availability: 0.999 }),
});

export type LoadScenarioInput = z.input<typeof LoadScenarioSchema>;

export type LoadScenario = z.output<typeof LoadScenarioSchema>;

export const MAX_STEPS = 1_000;
