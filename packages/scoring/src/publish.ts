import { catalogue } from "@repo/design";
import { type DesignGraph, emptyGraph } from "@repo/design";
import { applyOps, type DesignOp } from "@repo/design";

import { chaosBaseline, chaosSettings } from "./chaos";
import {
  drillOf,
  INTERVIEW_PHASES,
  type ProblemContent,
  ProblemContentSchema,
} from "./schema";
import { type Score, scoreSubmission } from "./score";
import {
  asDrawnWork,
  MAX_PROBLEM_STEPS,
  MAX_REFERENCE_WORK,
  problemSteps,
} from "./work";

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

export type IssuePath = ReadonlyArray<string | number>;

export interface PublishIssue {
  path: IssuePath;
  message: string;
}

export type PublishCheck =
  { ok: true; problem: ProblemContent } | { ok: false; issues: PublishIssue[] };

export const formatIssue = ({ path, message }: PublishIssue): string =>
  path.length === 0
    ? message
    : `${path
        .map((part, index) =>
          typeof part === "number"
            ? `[${part}]`
            : index === 0
              ? part
              : `.${part}`,
        )
        .join("")}: ${message}`;

const buildable = (graph: DesignGraph): string | null => {
  const ops: DesignOp[] = [
    ...graph.groups.map(({ storedOn: _, ...group }): DesignOp => ({
      op: "add-group",
      group,
    })),
    ...graph.nodes.map((node): DesignOp => ({ op: "add-node", node })),
    ...graph.edges.map((edge): DesignOp => ({ op: "add-edge", edge })),
    ...graph.groups.flatMap((group): DesignOp[] =>
      group.storedOn === undefined
        ? []
        : [
            {
              op: "update-group",
              id: group.id,
              patch: { storedOn: group.storedOn },
            },
          ],
    ),
  ];
  const result = applyOps(emptyGraph(), ops);

  return result.ok ? null : result.message;
};

export const MAX_HINT_COST = 50;

const repeats = (values: readonly string[]) =>
  values.flatMap((value, index) =>
    values.indexOf(value) === index ? [] : [{ value, index }],
  );

interface Named {
  name: string;
  path: IssuePath;
}

const named = <Item>(
  items: readonly Item[],
  at: IssuePath,
  names: (item: Item) => ReadonlyArray<readonly [string, ...IssuePath]>,
): Named[] =>
  items.flatMap((item, index) =>
    names(item).map(([name, ...field]) => ({
      name,
      path: [...at, index, ...field],
    })),
  );

const firstOfEach = (entries: readonly Named[], key = (name: string) => name) =>
  entries.filter(
    (entry, index) =>
      entries.findIndex((other) => key(other.name) === key(entry.name)) ===
      index,
  );

export const checkPublishable = (input: unknown): PublishCheck => {
  const parsed = ProblemContentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.filter(
          (part): part is string | number => typeof part !== "symbol",
        ),
        message: issue.message,
      })),
    };
  }

  const problem = parsed.data;
  const issues: PublishIssue[] = [];
  const add = (path: IssuePath, message: string) =>
    issues.push({ path, message });
  const drillIds = problem.drills.map((drill) => drill.id);
  const graphs = [
    ["baseline", problem.baseline],
    ["reference solution", problem.reference.graph],
  ] as const;

  for (const { value, index } of repeats(drillIds)) {
    add(["drills", index, "id"], `Two drills share the id ${value}.`);
  }
  for (const { value, index } of repeats(
    problem.rubric.map((item) => item.key),
  )) {
    add(["rubric", index, "key"], `Two rubric items share the key ${value}.`);
  }

  problem.rubric.forEach((item, index) => {
    if (
      item.check.check === "chaos-coverage" &&
      (!chaosBaseline(problem) || !chaosSettings(problem).enabled)
    ) {
      add(
        ["rubric", index, "check"],
        `Rubric item ${item.key} scores chaos, which needs a public load drill without faults to set the traffic.`,
      );
    }

    const drillId = drillOf(item.check);

    if (item.check.check === "has-node-kind" && drillId !== undefined) {
      const drill = problem.drills.find((entry) => entry.id === drillId);

      if (
        !catalogue[item.check.nodeKind].carriesTraffic ||
        (drill && drill.kind !== "load")
      ) {
        add(
          ["rubric", index, "check", "drillId"],
          `Rubric item ${item.key} names a drill for ${item.check.nodeKind}, which only a load drill and a kind that carries traffic can use.`,
        );
      }
    }

    if (drillId !== undefined && !drillIds.includes(drillId)) {
      add(
        ["rubric", index, "check", "drillId"],
        `Rubric item ${item.key} names a drill, ${drillId}, the problem does not have.`,
      );
    }
  });

  for (const [name, graph] of graphs) {
    const refusal = buildable(graph);

    if (refusal) {
      add(
        name === "baseline" ? ["baseline"] : ["reference", "graph"],
        `The ${name} could not be drawn by a solver: ${refusal}.`,
      );
    }
  }

  problem.drills.forEach((drill, index) => {
    const at = ["drills", index, "requirements"] as const;

    if (drill.kind === "key-value") {
      const { patterns, writes, cardinality, apart, ttl } = drill.requirements;

      if (patterns.length === 0) {
        add(
          [...at, "patterns"],
          `Drill ${drill.id} declares no access pattern; a key-value drill checks how items are read.`,
        );
      }

      const items = firstOfEach(
        [
          ...patterns.flatMap((pattern, p) =>
            pattern.items.map((item, i) => ({
              name: item,
              path: [...at, "patterns", p, "items", i],
            })),
          ),
          ...named(writes, [...at, "writes"], (item) => [[item.item, "item"]]),
          ...named(cardinality, [...at, "cardinality"], (item) => [
            [item.item, "item"],
          ]),
          ...named(apart, [...at, "apart"], (item) => [
            [item.item, "item"],
            [item.from, "from"],
          ]),
          ...named(ttl, [...at, "ttl"], (item) => [[item.item, "item"]]),
        ],
        (name) => name.toLowerCase(),
      );

      for (const [name, graph] of graphs) {
        for (const item of items) {
          const wanted = item.name.toLowerCase();

          if (
            !graph.nodes.some(
              (node) =>
                node.kind === "dynamo-table" &&
                node.props.items.some(
                  (candidate) => candidate.name.toLowerCase() === wanted,
                ),
            )
          ) {
            add(
              item.path,
              `Drill ${drill.id} names the item type ${wanted}, which the ${name} does not have.`,
            );
          }
        }
      }

      return;
    }

    if (drill.kind === "documents") {
      const { embedded, references, queries, unique, ttl } = drill.requirements;

      if (references.length === 0) {
        add(
          [...at, "references"],
          `Drill ${drill.id} declares no reference; a documents drill checks how collections relate.`,
        );
      }

      const collections = firstOfEach([
        ...named(embedded, [...at, "embedded"], (item) => [
          [item.collection, "collection"],
        ]),
        ...named(references, [...at, "references"], (item) => [
          [item.from, "from"],
          [item.to, "to"],
        ]),
        ...named(queries, [...at, "queries"], (item) => [
          [item.collection, "collection"],
        ]),
        ...named(unique, [...at, "unique"], (item) => [
          [item.collection, "collection"],
        ]),
        ...named(ttl, [...at, "ttl"], (item) => [
          [item.collection, "collection"],
        ]),
      ]);

      for (const [name, graph] of graphs) {
        for (const collection of collections) {
          if (
            !graph.nodes.some(
              (node) =>
                node.id === collection.name && node.kind === "collection",
            )
          ) {
            add(
              collection.path,
              `Drill ${drill.id} names the collection ${collection.name}, which the ${name} does not have.`,
            );
          }
        }
      }

      return;
    }

    if (drill.kind !== "schema") return;

    const { relationships, columns, queries } = drill.requirements;

    if (relationships.length === 0) {
      add(
        [...at, "relationships"],
        `Drill ${drill.id} declares no relationship; a schema drill checks how tables relate.`,
      );
    }

    const tables = firstOfEach([
      ...named(relationships, [...at, "relationships"], (item) =>
        item.cardinality === "one-to-many"
          ? [
              [item.parent, "parent"],
              [item.child, "child"],
            ]
          : item.between.map((table, i) => [table, "between", i] as const),
      ),
      ...named(columns, [...at, "columns"], (item) => [[item.table, "table"]]),
      ...named(queries, [...at, "queries"], (item) => [
        [item.from, "from"],
        ...(item.to ? ([[item.to, "to"]] as const) : []),
      ]),
    ]);

    for (const [name, graph] of graphs) {
      for (const table of tables) {
        if (
          !graph.nodes.some(
            (node) => node.id === table.name && node.kind === "table",
          )
        ) {
          add(
            table.path,
            `Drill ${drill.id} names the table ${table.name}, which the ${name} does not have.`,
          );
        }
      }
    }
  });

  const hintCost = problem.hints.reduce((sum, hint) => sum + hint.cost, 0);

  if (hintCost > MAX_HINT_COST) {
    add(
      ["hints"],
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
      add(
        ["interview", "rubric"],
        `The interview rubric weighs ${weights}, not 100.`,
      );
    }
    for (const { value, index } of repeats(
      interview.rubric.map((item) => item.key),
    )) {
      add(
        ["interview", "rubric", index, "key"],
        `Two interview rubric items share the key ${value}.`,
      );
    }
    for (const { value, index } of repeats(
      interview.phases.map((phase) => phase.id),
    )) {
      add(
        ["interview", "phases", index, "id"],
        `The interview plans the ${value} phase twice.`,
      );
    }

    const order = interview.phases.map((phase) =>
      INTERVIEW_PHASES.indexOf(phase.id),
    );
    const outOfOrder = order.findIndex(
      (value, index) => index > 0 && value < order[index - 1]!,
    );

    if (outOfOrder !== -1) {
      add(
        ["interview", "phases", outOfOrder],
        "The interview's phases are out of order.",
      );
    }
    interview.drillIds.forEach((id, index) => {
      if (!drillIds.includes(id)) {
        add(
          ["interview", "drillIds", index],
          `The interview runs a drill, ${id}, the problem does not have.`,
        );
      }
    });
  }

  if (!problem.drills.some((drill) => drill.visibility === "public")) {
    add(
      ["drills"],
      "A problem needs at least one public drill for solvers to run.",
    );
  }

  if (issues.length === 0) {
    const steps = problemSteps(problem);

    if (steps.total > MAX_PROBLEM_STEPS) {
      const longest = [...steps.drills].sort((a, b) => b.steps - a.steps)[0];
      const chaosLeads = !longest || steps.chaos > longest.steps;

      add(
        chaosLeads ? ["chaos"] : ["drills", longest.index, "durationSeconds"],
        `The drills simulate ${steps.total} steps in all, over the ${MAX_PROBLEM_STEPS} a problem may ask for; ${chaosLeads ? `each chaos case alone runs ${steps.chaos}` : `the longest, ${longest.id}, runs ${longest.steps}`}.`,
      );
    }
  }

  if (issues.length === 0) {
    const work = asDrawnWork(problem, problem.reference.graph);

    if (work > MAX_REFERENCE_WORK) {
      add(
        ["reference", "graph"],
        `Testing the reference solution once takes ${work.toLocaleString("en")} node-steps, over the ${MAX_REFERENCE_WORK.toLocaleString("en")} a problem may cost; use fewer or shorter drills, or a smaller reference.`,
      );
    }
  }

  if (issues.length === 0) {
    const reference = scoreSubmission(problem, problem.reference.graph);

    if (reference.score !== 100) {
      const missed = reference.items.filter((item) => !item.passed);

      add(
        ["reference", "graph"],
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
