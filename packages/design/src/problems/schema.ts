import z from "zod";

import {
  ALERT_SIGNALS,
  NODE_KINDS,
  type NodeKind,
  type Track,
  TRACKS,
} from "../catalogue";
import { FINDING_KINDS } from "../evaluate/result";
import { ReleaseSchema, SloSchema } from "../evaluate/scenario";
import { DesignGraphSchema, IdSchema } from "../graph";
import { LINT_IDS } from "../lints";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type ProblemTrack = Track;

const NodeKindSchema = z.enum(NODE_KINDS as [NodeKind, ...NodeKind[]]);

export const NodeSelectorSchema = z.strictObject({
  nodeKind: NodeKindSchema,
  role: z.enum(["any", "primary"]).default("any"),
});
export type NodeSelector = z.output<typeof NodeSelectorSchema>;

const Seconds = z.number().min(0).max(86_400);
const window = { at: Seconds, until: Seconds.optional() };

export const DrillFaultSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("node-down"),
    select: NodeSelectorSchema,
    ...window,
  }),
  z.strictObject({
    kind: z.literal("capacity"),
    select: NodeSelectorSchema,
    ...window,
    factor: z.number().min(0).max(100),
  }),
  z.strictObject({
    kind: z.literal("latency"),
    select: NodeSelectorSchema,
    ...window,
    addMs: z.number().min(0).max(600_000),
  }),
  z.strictObject({
    kind: z.literal("cache-flush"),
    select: NodeSelectorSchema,
    at: Seconds,
  }),
  z.strictObject({
    kind: z.literal("region-down"),
    select: NodeSelectorSchema,
    ...window,
  }),
  z.strictObject({
    kind: z.literal("rollout"),
    select: NodeSelectorSchema,
    at: Seconds,
    release: ReleaseSchema.default("healthy"),
  }),
]);
export type DrillFault = z.output<typeof DrillFaultSchema>;

export const DrillExpectationSchema = z.strictObject({
  maxP99Ms: z.number().positive().optional(),
  minAvailability: z.number().min(0).max(1).optional(),
  endAvailability: z.number().min(0).max(1).optional(),
  maxEndBacklog: z.number().min(0).optional(),
  forbid: z.array(z.enum(FINDING_KINDS)).default([]),
});
export type DrillExpectation = z.output<typeof DrillExpectationSchema>;

export const DrillSchema = z.strictObject({
  id: IdSchema,
  title: z.string().min(1).max(120),
  description: z.string().max(2_000).default(""),
  visibility: z.enum(["public", "hidden"]),
  durationSeconds: z.number().int().min(10).max(3_600).default(600),
  traffic: z
    .array(
      z.strictObject({ at: Seconds, multiplier: z.number().min(0).max(1_000) }),
    )
    .max(20)
    .default([]),
  faults: z.array(DrillFaultSchema).max(20).default([]),
  slo: SloSchema.default({ p99Ms: 300, availability: 0.999 }),
  expect: DrillExpectationSchema,
});
export type Drill = z.output<typeof DrillSchema>;

export const CheckRefSchema = z.discriminatedUnion("check", [
  z.strictObject({ check: z.literal("drill-passes"), drillId: IdSchema }),
  z.strictObject({
    check: z.literal("no-finding-under-drill"),
    drillId: IdSchema,
    finding: z.enum(FINDING_KINDS),
  }),
  z.strictObject({
    check: z.literal("has-node-kind"),
    nodeKind: NodeKindSchema,
    min: z.number().int().min(1).max(100).default(1),
  }),
  z.strictObject({ check: z.literal("throttles") }),
  z.strictObject({
    check: z.literal("watches"),
    nodeKind: NodeKindSchema,
    signal: z.enum(ALERT_SIGNALS),
  }),
  z.strictObject({
    check: z.literal("no-lint"),
    lint: z.enum(LINT_IDS as [string, ...string[]]),
  }),
]);
export type CheckRef = z.output<typeof CheckRefSchema>;

export const MAX_HINTS = 3;

export const HintSchema = z.strictObject({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2_000),
  cost: z.number().int().min(1).max(30),
});
export type Hint = z.output<typeof HintSchema>;

export const RubricItemSchema = z.strictObject({
  key: IdSchema,
  title: z.string().min(1).max(160),
  weight: z.number().int().min(1).max(100),
  check: CheckRefSchema,
});
export type RubricItem = z.output<typeof RubricItemSchema>;

export const INTERVIEW_PHASES = [
  "requirements",
  "high-level",
  "deep-dive",
  "wrap-up",
] as const;
export type InterviewPhase = (typeof INTERVIEW_PHASES)[number];

export const INTERVIEW_DIMENSIONS = [
  "requirements",
  "design",
  "scaling",
  "reliability",
  "delivery",
  "operability",
  "communication",
] as const;
export type InterviewDimension = (typeof INTERVIEW_DIMENSIONS)[number];

export const InterviewFactSchema = z.strictObject({
  topic: z.string().min(1).max(120),
  answer: z.string().min(1).max(1_000),
});
export type InterviewFact = z.output<typeof InterviewFactSchema>;

export const InterviewPhaseSchema = z.strictObject({
  id: z.enum(INTERVIEW_PHASES),
  minutes: z.number().int().min(1).max(60),
  goal: z.string().min(1).max(500),
});
export type InterviewPhasePlan = z.output<typeof InterviewPhaseSchema>;

export const InterviewRubricItemSchema = z.strictObject({
  key: IdSchema,
  dimension: z.enum(INTERVIEW_DIMENSIONS),
  title: z.string().min(1).max(160),
  signals: z.array(z.string().min(1).max(300)).min(1).max(8),
  weight: z.number().int().min(1).max(100),
});
export type InterviewRubricItem = z.output<typeof InterviewRubricItemSchema>;

export const InterviewContentSchema = z.strictObject({
  opening: z.string().min(1).max(1_000),
  facts: z.array(InterviewFactSchema).max(30).default([]),
  phases: z.array(InterviewPhaseSchema).min(1).max(INTERVIEW_PHASES.length),
  rubric: z.array(InterviewRubricItemSchema).min(1).max(20),
  drillIds: z.array(IdSchema).min(1).max(10),
});
export type InterviewContent = z.output<typeof InterviewContentSchema>;

export const ProblemContentSchema = z.strictObject({
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(3).max(120),
  track: z.enum(TRACKS),
  difficulty: z.enum(DIFFICULTIES),
  tags: z.array(z.string().min(1).max(40)).max(10).default([]),
  summary: z.string().min(1).max(280),
  statement: z.string().min(1).max(20_000),
  baseline: DesignGraphSchema,
  drills: z.array(DrillSchema).min(1).max(20),
  rubric: z.array(RubricItemSchema).min(1).max(40),
  hints: z.array(HintSchema).max(MAX_HINTS).default([]),
  interview: InterviewContentSchema.optional(),
  reference: z.strictObject({
    graph: DesignGraphSchema,
    notes: z.string().max(20_000).default(""),
  }),
});
export type ProblemContent = z.output<typeof ProblemContentSchema>;
export type ProblemContentInput = z.input<typeof ProblemContentSchema>;
