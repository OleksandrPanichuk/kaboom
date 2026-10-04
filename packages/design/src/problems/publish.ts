import { type DesignGraph, emptyGraph } from "../graph";
import { applyOps, type DesignOp } from "../ops";
import { chaosBaseline, chaosSettings } from "../testing/chaos";
import {
  drillOf,
  INTERVIEW_PHASES,
  type ProblemContent,
  ProblemContentSchema,
} from "./schema";
import { type Score, scoreSubmission } from "./score";

export interface PublicDrill {
  id: string;
  title: string;
  description: string;
  visibility: "public" | "hidden";
}

export interface PublicProblem {
  slug: string;
  title: string;
  track: ProblemContent["track"];
  difficulty: ProblemContent["difficulty"];
  tags: string[];
  summary: string;
  statement: string;
  baseline: DesignGraph;
  drills: PublicDrill[];
  rubric: Array<{ key: string; title: string; weight: number }>;
  hints: Array<{ index: number; title: string; cost: number }>;
  interviewable: boolean;
}

export const publicProblem = (problem: ProblemContent): PublicProblem => ({
  slug: problem.slug,
  title: problem.title,
  track: problem.track,
  difficulty: problem.difficulty,
  tags: problem.tags,
  summary: problem.summary,
  statement: problem.statement,
  baseline: problem.baseline,
  drills: problem.drills.map((drill) => ({
    id: drill.id,
    title: drill.title,
    description: drill.visibility === "public" ? drill.description : "",
    visibility: drill.visibility,
  })),
  rubric: problem.rubric.map(({ key, title, weight }) => ({
    key,
    title,
    weight,
  })),
  hints: problem.hints.map(({ title, cost }, index) => ({
    index,
    title,
    cost,
  })),
  interviewable: problem.interview !== undefined,
});

export type PublishCheck =
  { ok: true; problem: ProblemContent } | { ok: false; issues: string[] };

const buildable = (graph: DesignGraph): string | null => {
  const ops: DesignOp[] = [
    ...graph.groups.map((group): DesignOp => ({ op: "add-group", group })),
    ...graph.nodes.map((node): DesignOp => ({ op: "add-node", node })),
    ...graph.edges.map((edge): DesignOp => ({ op: "add-edge", edge })),
  ];
  const result = applyOps(emptyGraph(), ops);

  return result.ok ? null : result.message;
};

export const MAX_HINT_COST = 50;

const duplicates = (values: string[]) => [
  ...new Set(values.filter((value, index) => values.indexOf(value) !== index)),
];

export const checkPublishable = (input: unknown): PublishCheck => {
  const parsed = ProblemContentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }

  const problem = parsed.data;
  const issues: string[] = [];
  const drillIds = problem.drills.map((drill) => drill.id);

  for (const id of duplicates(drillIds))
    issues.push(`Two drills share the id ${id}.`);
  for (const key of duplicates(problem.rubric.map((item) => item.key))) {
    issues.push(`Two rubric items share the key ${key}.`);
  }

  for (const item of problem.rubric) {
    if (
      item.check.check === "chaos-coverage" &&
      (!chaosBaseline(problem) || !chaosSettings(problem).enabled)
    ) {
      issues.push(
        `Rubric item ${item.key} scores chaos, which needs a public load drill without faults to set the traffic.`,
      );
    }

    const named = drillOf(item.check);

    if (named !== undefined && !drillIds.includes(named)) {
      issues.push(
        `Rubric item ${item.key} names a drill, ${named}, the problem does not have.`,
      );
    }
  }

  for (const [name, graph] of [
    ["baseline", problem.baseline],
    ["reference solution", problem.reference.graph],
  ] as const) {
    const refusal = buildable(graph);

    if (refusal) {
      issues.push(`The ${name} could not be drawn by a solver: ${refusal}.`);
    }
  }

  const hintCost = problem.hints.reduce((sum, hint) => sum + hint.cost, 0);

  if (hintCost > MAX_HINT_COST) {
    issues.push(
      `Revealing every hint costs ${hintCost} points; keep it at ${MAX_HINT_COST} or less.`,
    );
  }

  if (problem.interview) {
    const { interview } = problem;
    const weights = interview.rubric.reduce(
      (sum, item) => sum + item.weight,
      0,
    );

    if (weights !== 100) {
      issues.push(`The interview rubric weighs ${weights}, not 100.`);
    }
    for (const key of duplicates(interview.rubric.map((item) => item.key))) {
      issues.push(`Two interview rubric items share the key ${key}.`);
    }
    for (const id of duplicates(interview.phases.map((phase) => phase.id))) {
      issues.push(`The interview plans the ${id} phase twice.`);
    }

    const order = interview.phases.map((phase) =>
      INTERVIEW_PHASES.indexOf(phase.id),
    );

    if (order.some((value, index) => index > 0 && value < order[index - 1]!)) {
      issues.push("The interview's phases are out of order.");
    }
    for (const id of interview.drillIds) {
      if (!drillIds.includes(id)) {
        issues.push(
          `The interview runs a drill, ${id}, the problem does not have.`,
        );
      }
    }
  }

  if (!problem.drills.some((drill) => drill.visibility === "public")) {
    issues.push(
      "A problem needs at least one public drill for solvers to run.",
    );
  }

  if (issues.length === 0) {
    const reference = scoreSubmission(problem, problem.reference.graph);

    if (reference.score !== 100) {
      const missed = reference.items.filter((item) => !item.passed);

      issues.push(
        `The reference solution scores ${reference.score}, not 100: ${missed.map((item) => `${item.title} (${item.evidence})`).join("; ")}`,
      );
    }
  }

  return issues.length === 0 ? { ok: true, problem } : { ok: false, issues };
};

export const HIDDEN_PASSED = "Passed a hidden drill.";
export const HIDDEN_FAILED = "A hidden drill found a problem.";

export const publicScore = (problem: ProblemContent, score: Score): Score => {
  const hidden = new Set(
    problem.drills
      .filter((drill) => drill.visibility === "hidden")
      .map((drill) => drill.id),
  );
  const onHidden = new Set(
    problem.rubric
      .filter((item) => hidden.has(drillOf(item.check) ?? ""))
      .map((item) => item.key),
  );

  return {
    score: score.score,
    items: score.items.map((item) =>
      onHidden.has(item.key)
        ? { ...item, evidence: item.passed ? HIDDEN_PASSED : HIDDEN_FAILED }
        : item,
    ),
    drills: score.drills.map((drill) =>
      drill.visibility === "hidden" ? { ...drill, failures: [] } : drill,
    ),
  };
};
