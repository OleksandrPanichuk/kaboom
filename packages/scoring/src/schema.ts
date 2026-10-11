import {
  ALERT_SIGNALS,
  NODE_KINDS,
  type NodeKind,
  type Track,
  TRACKS,
} from "@repo/design";
import { DocumentRequirementsSchema } from "@repo/design";
import { KeyValueRequirementsSchema } from "@repo/design";
import { FINDING_KINDS } from "@repo/design";
import { ReleaseSchema, SloSchema } from "@repo/design";
import { SchemaRequirementsSchema } from "@repo/design";
import { DesignGraphSchema, IdSchema } from "@repo/design";
import { LINT_IDS } from "@repo/design";
import z from "zod";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type ProblemTrack = Track;

const NodeKindSchema = z
  .enum(NODE_KINDS as [NodeKind, ...NodeKind[]])
  .meta({ title: "Node kind" });

const DrillRef = IdSchema.meta({
  ref: "drill",
  title: "Drill",
  description: "One of this problem's drills",
});

export const NodeSelectorSchema = z
  .strictObject({
    nodeKind: NodeKindSchema,
    role: z.enum(["any", "primary"]).default("any").meta({
      description:
        "Primary picks the node the others replicate from, such as a database's primary",
    }),
  })
  .meta({
    title: "Which node",
    description:
      "The fault hits the solver's node of this kind, whatever they named it",
  });
export type NodeSelector = z.output<typeof NodeSelectorSchema>;

const Seconds = z.number().min(0).max(86_400);
const window = {
  at: Seconds.meta({ title: "Starts at (s)" }),
  until: Seconds.optional().meta({
    title: "Ends at (s)",
    description: "Leave empty to last until the drill ends",
  }),
};

export const DrillFaultSchema = z.discriminatedUnion("kind", [
  z
    .strictObject({
      kind: z.literal("node-down"),
      select: NodeSelectorSchema,
      ...window,
    })
    .meta({ title: "Node down", description: "The node fails outright" }),
  z
    .strictObject({
      kind: z.literal("capacity"),
      select: NodeSelectorSchema,
      ...window,
      factor: z
        .number()
        .min(0)
        .max(100)
        .meta({
          description: "1 is normal; 0.5 halves what the node can serve",
          examples: [0.5],
        }),
    })
    .meta({
      title: "Capacity",
      description: "The node serves this share of its capacity",
    }),
  z
    .strictObject({
      kind: z.literal("latency"),
      select: NodeSelectorSchema,
      ...window,
      addMs: z.number().min(0).max(600_000),
    })
    .meta({
      title: "Added latency",
      description: "Every request through the node takes longer",
    }),
  z
    .strictObject({
      kind: z.literal("error-rate"),
      select: NodeSelectorSchema,
      ...window,
      rate: z
        .number()
        .min(0)
        .max(1)
        .meta({ description: "A share, 0 to 1", examples: [0.05] }),
    })
    .meta({
      title: "Error rate",
      description: "The node fails a share of requests",
    }),
  z
    .strictObject({
      kind: z.literal("group-down"),
      select: NodeSelectorSchema,
      ...window,
    })
    .meta({
      title: "Group down",
      description: "The region, VPC or database holding the node fails",
    }),
  z
    .strictObject({
      kind: z.literal("partition"),
      select: NodeSelectorSchema,
      ...window,
    })
    .meta({
      title: "Partition",
      description: "The node is cut off from the rest",
    }),
  z
    .strictObject({
      kind: z.literal("cache-flush"),
      select: NodeSelectorSchema,
      at: Seconds,
    })
    .meta({ title: "Cache flush", description: "The cache is emptied" }),
  z
    .strictObject({
      kind: z.literal("region-down"),
      select: NodeSelectorSchema,
      ...window,
    })
    .meta({ title: "Region down", description: "The whole region fails" }),
  z
    .strictObject({
      kind: z.literal("rollout"),
      select: NodeSelectorSchema,
      at: Seconds,
      release: ReleaseSchema.default("healthy"),
      migrates: z.boolean().default(false),
    })
    .meta({
      title: "Rollout",
      description: "A deployment rolls out a new release",
    }),
  z
    .strictObject({
      kind: z.literal("secret-rotation"),
      select: NodeSelectorSchema,
      at: Seconds,
    })
    .meta({
      title: "Secret rotation",
      description: "A secret is rotated; old values stop working",
    }),
]);
export type DrillFault = z.output<typeof DrillFaultSchema>;

const Forbid = z.array(z.enum(FINDING_KINDS)).default([]).meta({
  title: "Forbidden findings",
  description: "The drill fails if the run reports any of these",
});

export const DrillExpectationSchema = z
  .strictObject({
    maxP99Ms: z.number().positive().optional().meta({
      title: "Worst p99 (ms)",
      description: "The slowest the 99th percentile may get during the drill",
    }),
    minAvailability: z.number().min(0).max(1).optional().meta({
      title: "Lowest availability",
      description: "The smallest share of requests that must succeed, 0 to 1",
    }),
    endAvailability: z.number().min(0).max(1).optional().meta({
      title: "Availability at the end",
      description: "What must succeed once the drill is over",
    }),
    maxEndBacklog: z.number().min(0).optional().meta({
      title: "Backlog left at the end",
      description: "Messages a queue or stream may still hold",
    }),
    endMaxP99Ms: z.number().positive().optional().meta({
      title: "p99 at the end (ms)",
    }),
    maxPods: z.number().int().min(1).optional().meta({
      title: "Most pods",
      description: "The most pods the design may run, to keep it within budget",
    }),
    detectWithinSeconds: z.number().int().min(0).optional().meta({
      title: "Page within (s)",
      description: "An alert must fire this soon after the fault starts",
    }),
    forbid: Forbid,
  })
  .meta({ title: "Passes when" });
export type DrillExpectation = z.output<typeof DrillExpectationSchema>;

const Visibility = z.enum(["public", "hidden"]).meta({
  description:
    "Solvers run public drills themselves; hidden ones run only on submit",
});

const drillBase = {
  id: IdSchema.meta({
    title: "Id",
    description: "A short name rubric items and interviews point at",
  }),
  title: z.string().min(1).max(120),
  description: z.string().max(2_000).default(""),
  visibility: Visibility,
};

export const LoadDrillSchema = z
  .strictObject({
    kind: z.literal("load").default("load"),
    ...drillBase,
    durationSeconds: z
      .number()
      .int()
      .min(10)
      .max(3_600)
      .default(600)
      .meta({ title: "Duration (s)" }),
    traffic: z
      .array(
        z
          .strictObject({
            at: Seconds.meta({ title: "From (s)" }),
            multiplier: z
              .number()
              .min(0)
              .max(1_000)
              .meta({
                description: "Times the clients' usual traffic; 4 is a surge",
                examples: [2],
              }),
          })
          .meta({ title: "Traffic change" }),
      )
      .max(20)
      .default([])
      .meta({
        description:
          "When traffic changes during the drill; it starts at the clients' usual rate",
      }),
    faults: z.array(DrillFaultSchema).max(20).default([]).meta({
      description: "What breaks during the drill, and when",
    }),
    slo: SloSchema.default({ p99Ms: 300, availability: 0.999 }).meta({
      title: "SLO",
      description: "The target the run is drawn against",
    }),
    expect: DrillExpectationSchema,
  })
  .meta({
    title: "Load",
    description: "Traffic and faults played against the design over time",
  });
export type LoadDrill = z.output<typeof LoadDrillSchema>;

export const PipelineDrillSchema = z
  .strictObject({
    kind: z.literal("pipeline"),
    ...drillBase,
    changedShare: z.number().min(0).max(1).default(1),
    expect: z.strictObject({
      maxLeadTimeMinutes: z.number().positive().optional(),
      minGreenRate: z.number().min(0).max(1).optional(),
      forbid: Forbid,
    }),
  })
  .meta({ title: "Pipeline", description: "Times the delivery pipeline" });
export type PipelineDrill = z.output<typeof PipelineDrillSchema>;

export const NetworkDrillSchema = z
  .strictObject({
    kind: z.literal("network"),
    ...drillBase,
    expect: z.strictObject({ forbid: Forbid }),
  })
  .meta({
    title: "Network",
    description: "Checks VPCs, subnets and what the internet can reach",
  });
export type NetworkDrill = z.output<typeof NetworkDrillSchema>;

export const SchemaDrillSchema = z
  .strictObject({
    kind: z.literal("schema"),
    ...drillBase,
    requirements: SchemaRequirementsSchema,
    expect: z.strictObject({ forbid: Forbid }).default({ forbid: [] }),
  })
  .meta({
    title: "SQL schema",
    description: "Relationships, columns and indexed lookups of tables",
  });
export type SchemaDrill = z.output<typeof SchemaDrillSchema>;

export const DocumentsDrillSchema = z
  .strictObject({
    kind: z.literal("documents"),
    ...drillBase,
    requirements: DocumentRequirementsSchema,
  })
  .meta({
    title: "Documents",
    description: "What MongoDB collections embed, reference and index",
  });
export type DocumentsDrill = z.output<typeof DocumentsDrillSchema>;

export const KeyValueDrillSchema = z
  .strictObject({
    kind: z.literal("key-value"),
    ...drillBase,
    requirements: KeyValueRequirementsSchema,
  })
  .meta({
    title: "Key-value",
    description: "Access patterns and partitions of DynamoDB tables",
  });
export type KeyValueDrill = z.output<typeof KeyValueDrillSchema>;

export const DrillSchema = z.union([
  PipelineDrillSchema,
  NetworkDrillSchema,
  SchemaDrillSchema,
  DocumentsDrillSchema,
  KeyValueDrillSchema,
  LoadDrillSchema,
]);
export type Drill = z.output<typeof DrillSchema>;

export const CheckRefSchema = z.discriminatedUnion("check", [
  z
    .strictObject({ check: z.literal("drill-passes"), drillId: DrillRef })
    .meta({ title: "A drill passes" }),
  z
    .strictObject({
      check: z.literal("no-finding-under-drill"),
      drillId: DrillRef,
      finding: z.enum(FINDING_KINDS),
    })
    .meta({ title: "No finding under a drill" }),
  z
    .strictObject({
      check: z.literal("has-node-kind"),
      nodeKind: NodeKindSchema,
      drillId: DrillRef.optional(),
      min: z.number().int().min(1).max(100).default(1),
    })
    .meta({
      title: "Uses a kind of node",
      description: "Counts only nodes that take part",
    }),
  z
    .strictObject({ check: z.literal("throttles") })
    .meta({ title: "Throttles traffic" }),
  z
    .strictObject({
      check: z.literal("watches"),
      nodeKind: NodeKindSchema,
      signal: z.enum(ALERT_SIGNALS),
    })
    .meta({
      title: "Watches a node",
      description: "An alert on the node, which monitoring scrapes",
    }),
  z
    .strictObject({
      check: z.literal("no-lint"),
      lint: z.enum(LINT_IDS as [string, ...string[]]),
    })
    .meta({ title: "No check warning" }),
  z
    .strictObject({
      check: z.literal("serves-reads"),
      drillId: DrillRef,
      nodeKind: NodeKindSchema,
      minShare: z
        .number()
        .gt(0)
        .max(1)
        .meta({ title: "Least share served", examples: [0.8] }),
    })
    .meta({
      title: "Serves reads from a kind",
      description: "A cache or CDN by its hit ratio",
    }),
  z
    .strictObject({
      check: z.literal("within-budget"),
      drillId: DrillRef,
      monthlyUsd: z
        .number()
        .positive()
        .meta({ title: "Monthly budget ($)", examples: [500] }),
    })
    .meta({
      title: "Within budget",
      description: "Priced at the traffic of a drill, once it passes",
    }),
  z
    .strictObject({
      check: z.literal("chaos-coverage"),
      min: z.number().gt(0).max(1).default(1),
    })
    .meta({
      title: "Survives chaos",
      description: "Scores the share of generated faults survived",
    }),
]);
export type CheckRef = z.output<typeof CheckRefSchema>;

export const drillOf = (check: CheckRef): string | undefined =>
  "drillId" in check ? check.drillId : undefined;

export const MAX_HINTS = 3;

export const HintSchema = z.strictObject({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2_000),
  cost: z
    .number()
    .int()
    .min(1)
    .max(30)
    .meta({
      title: "Cost (points)",
      description: "Taken off the score of whoever reveals it",
      examples: [5],
    }),
});
export type Hint = z.output<typeof HintSchema>;

export const RubricItemSchema = z.strictObject({
  key: IdSchema,
  title: z.string().min(1).max(160),
  weight: z
    .number()
    .int()
    .min(1)
    .max(100)
    .meta({
      description: "Its share of the score; the weights add up to 100",
      examples: [10],
    }),
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
  "integrity",
  "query-performance",
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
  drillIds: z.array(DrillRef).min(1).max(10).meta({
    title: "Drills to run",
    description: "What the interviewer may play during the deep dive",
  }),
});
export type InterviewContent = z.output<typeof InterviewContentSchema>;

export const ChaosSettingsSchema = z
  .strictObject({
    enabled: z.boolean().default(true),
    faultAt: Seconds.default(60).meta({ title: "Fault starts at (s)" }),
    faultSeconds: z
      .number()
      .int()
      .min(10)
      .max(1_800)
      .default(120)
      .meta({ title: "Fault lasts (s)" }),
    graceSeconds: z.number().int().min(0).max(600).default(45).meta({
      title: "Grace (s)",
      description:
        "How long the design may struggle before it must serve again",
    }),
    recoverySeconds: z.number().int().min(0).max(1_800).default(60).meta({
      title: "Recovery (s)",
      description: "Time to be back within the SLO",
    }),
    minAvailability: z
      .number()
      .min(0)
      .max(1)
      .default(0.99)
      .meta({ title: "Lowest availability" }),
    errorRate: z.number().min(0).max(1).default(0.05).meta({
      title: "Dependency error rate",
      description: "What a failing dependency fails in each chaos case",
    }),
    maxCases: z
      .number()
      .int()
      .min(1)
      .max(60)
      .default(40)
      .meta({ title: "Most cases" }),
  })
  .refine(
    (settings) =>
      settings.graceSeconds + 10 <= settings.faultSeconds &&
      settings.recoverySeconds >= 10,
    "Chaos needs at least 10 s of fault after its grace, and 10 s to recover in.",
  );
export type ChaosSettings = z.output<typeof ChaosSettingsSchema>;

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
  chaos: ChaosSettingsSchema.optional(),
  reference: z.strictObject({
    graph: DesignGraphSchema,
    notes: z.string().max(20_000).default(""),
  }),
});
export type ProblemContent = z.output<typeof ProblemContentSchema>;
export type ProblemContentInput = z.input<typeof ProblemContentSchema>;
