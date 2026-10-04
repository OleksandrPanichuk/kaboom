import { catalogue } from "../catalogue";
import { costOf, type NodeLoad } from "../cost";
import type { EvaluationResult } from "../evaluate/result";
import type { DesignGraph } from "../graph";
import { runLints } from "../lints";
import {
  chaosBaseline,
  type ChaosCase,
  chaosCases,
  type ChaosOutcome,
  chaosSettings,
  loadedNodes,
  runChaosCase,
} from "../testing/chaos";
import {
  affordable,
  CHAOS_SEEDS,
  runCost,
  statusOf,
  type Variation,
  VARIATION_BUDGET,
  varied,
} from "../testing/variation";
import { type DrillOutcome, runDrill } from "./drills";
import { drillScenario, selectNodes } from "./resolve";
import type { CheckRef, ProblemContent, RubricItem } from "./schema";

export interface ItemScore {
  key: string;
  title: string;
  weight: number;
  passed: boolean;
  evidence: string;
  ratio?: number;
}

export interface ChaosResult {
  chaos: ChaosCase;
  outcome: ChaosOutcome | null;
  variation: Variation | null;
  skipped: string | null;
  durationMs: number;
}

export interface DrillScore {
  id: string;
  title: string;
  visibility: "public" | "hidden";
  passed: boolean;
  failures: string[];
}

export interface Score {
  score: number;
  items: ItemScore[];
  drills: DrillScore[];
}

const serves = (graph: DesignGraph): boolean =>
  graph.edges.some((edge) =>
    graph.nodes.some((node) => node.kind === "client" && node.id === edge.from),
  );

export interface DrillRunner {
  graph: DesignGraph;
  seeds: number;
  baselineId: string | null;
  drillTitle: (id: string) => string;
  drill: (id: string) => DrillOutcome | undefined;
  variation: (id: string) => Variation | null;
  durationOf: (id: string) => number;
  chaos: () => ChaosResult[];
}

type Context = Pick<
  DrillRunner,
  "graph" | "drill" | "chaos" | "variation" | "drillTitle" | "baselineId"
>;

export interface DrillRunnerOptions {
  seeds?: number;
}

export const drillRunner = (
  problem: ProblemContent,
  graph: DesignGraph,
  { seeds = 0 }: DrillRunnerOptions = {},
): DrillRunner => {
  const outcomes = new Map<string, DrillOutcome>();
  const durations = new Map<string, number>();
  const variations = new Map<string, Variation | null>();
  let share: number | null = null;
  const shareOf = (): number => {
    if (share !== null) return share;

    const drillCost = problem.drills.reduce(
      (sum, item) =>
        item.kind === "load"
          ? sum + runCost(graph, drillScenario(item, graph)) * seeds
          : sum,
      0,
    );
    const baseline = chaosBaseline(problem);
    const settings = chaosSettings(problem);
    const base = baseline ? runner.drill(baseline.id) : undefined;
    const chaosCost =
      baseline && settings.enabled && base?.passed && base.result
        ? chaosCases(graph, settings, loadedNodes(base.result)).length *
          runCost(graph, {
            kind: "load",
            durationSeconds:
              settings.faultAt +
              settings.faultSeconds +
              settings.recoverySeconds,
          }) *
          Math.min(seeds, CHAOS_SEEDS)
        : 0;
    const total = drillCost + chaosCost;

    share = total === 0 ? 1 : VARIATION_BUDGET / total;

    return share;
  };
  const options = { keepsWrites: problem.track === "system-design" };
  let chaos: ChaosResult[] | null = null;

  const runner: DrillRunner = {
    graph,
    seeds,
    baselineId: chaosBaseline(problem)?.id ?? null,
    drillTitle: (id) =>
      problem.drills.find((item) => item.id === id)?.title ?? id,
    chaos: () => {
      if (chaos) return chaos;

      const baseline = chaosBaseline(problem);
      const settings = chaosSettings(problem);

      if (!baseline || !settings.enabled) {
        chaos = [];

        return chaos;
      }

      const base = runner.drill(baseline.id);
      const ready = base?.passed ?? false;
      const loaded = base?.result ? loadedNodes(base.result) : undefined;

      chaos = chaosCases(graph, settings, loaded).map((item) => {
        if (!ready) {
          return {
            chaos: item,
            outcome: null,
            variation: null,
            skipped: `Faults are drawn once “${baseline.title}” passes; a design that fails without them says nothing new with them.`,
            durationMs: 0,
          };
        }

        const started = performance.now();
        const outcome = runChaosCase(graph, item, baseline, settings);
        const wanted = Math.min(seeds, CHAOS_SEEDS);
        const variation =
          outcome.passed && wanted > 0
            ? varied(affordable(wanted, shareOf()), (seed) =>
                runChaosCase(graph, item, baseline, settings, seed),
              )
            : null;

        return {
          chaos: item,
          outcome,
          variation,
          skipped: null,
          durationMs: performance.now() - started,
        };
      });

      return chaos;
    },
    drill: (id) => {
      if (!outcomes.has(id)) {
        const found = problem.drills.find((item) => item.id === id);

        if (found) {
          const started = performance.now();

          outcomes.set(id, runDrill(found, graph, 0, options));
          durations.set(id, performance.now() - started);
        }
      }

      return outcomes.get(id);
    },
    variation: (id) => {
      if (variations.has(id)) return variations.get(id) ?? null;

      const found = problem.drills.find((item) => item.id === id);
      const outcome = runner.drill(id);
      let variation: Variation | null = null;

      if (
        found?.kind === "load" &&
        outcome?.passed &&
        outcome.scenario &&
        seeds > 0
      ) {
        const started = performance.now();

        variation = varied(affordable(seeds, shareOf()), (seed) =>
          runDrill(found, graph, seed, options),
        );
        durations.set(
          id,
          (durations.get(id) ?? 0) + performance.now() - started,
        );
      }

      variations.set(id, variation);

      return variation;
    },
    durationOf: (id) => durations.get(id) ?? 0,
  };

  return runner;
};

export const FLAKY_SHARE = 0.5;

const SIDE_EDGES = new Set(["lock", "replication"]);

const takesPart = (
  graph: DesignGraph,
  id: string,
  result: EvaluationResult | undefined,
): boolean => {
  const edges = graph.edges.filter(
    (edge) => edge.from === id || edge.to === id,
  );

  if (!result) {
    const placed = graph.nodes.find((node) => node.id === id)?.groupId;

    return edges.length > 0 || (placed !== undefined && placed !== null);
  }

  const carries = (nodeId: string) =>
    result.steps.some((step) =>
      graph.edges.some((edge) => {
        if (edge.from !== nodeId && edge.to !== nodeId) return false;

        const flow = step.edges[edge.id];

        return (flow?.reads ?? 0) + (flow?.writes ?? 0) > 0;
      }),
    );

  return (
    carries(id) ||
    edges.some(
      (edge) =>
        SIDE_EDGES.has(edge.kind) &&
        carries(edge.from === id ? edge.to : edge.from),
    )
  );
};

const labelOf = (node: { label: string; id: string }) => node.label || node.id;

const dollars = (value: number) => `$${Math.round(value).toLocaleString("en")}`;

export const averageLoads = (
  result: EvaluationResult,
): Record<string, NodeLoad> => {
  const loads: Record<string, NodeLoad> = {};
  const count = Math.max(1, result.steps.length);

  for (const step of result.steps) {
    for (const [id, numbers] of Object.entries(step.nodes)) {
      const load = (loads[id] ??= { reads: 0, writes: 0 });

      load.reads += numbers.reads / count;
      load.writes += numbers.writes / count;

      if (numbers.replicas !== undefined) {
        load.replicas = (load.replicas ?? 0) + numbers.replicas / count;
      }
    }
  }

  return loads;
};

const HIT_RATIO_KINDS = new Set(["cache", "cdn"]);

export const readShare = (
  graph: DesignGraph,
  result: EvaluationResult,
  kind: string,
): number => {
  const servers = graph.nodes.filter((node) => node.kind === kind);
  const ids = new Set(servers.map((node) => node.id));
  let asked = 0;
  let answered = 0;

  for (const step of result.steps) {
    for (const node of graph.nodes) {
      if (node.kind !== "client") continue;

      const readRatio = (node.props as { readRatio?: number }).readRatio ?? 1;

      asked += (step.clients[node.id]?.emitted ?? 0) * readRatio;
    }

    for (const server of servers) {
      const reads = (from: boolean) =>
        graph.edges
          .filter((edge) =>
            from
              ? edge.from === server.id && !ids.has(edge.to)
              : edge.to === server.id && !ids.has(edge.from),
          )
          .reduce(
            (sum, edge) =>
              sum +
              (step.edges[edge.id]?.reads ?? 0) /
                (from ? 1 : edge.props.fanOut),
            0,
          );
      const load = step.nodes[server.id]?.reads ?? 0;
      const hit =
        HIT_RATIO_KINDS.has(server.kind) && load > 0
          ? Math.max(0, 1 - reads(true) / load)
          : 1;

      answered += reads(false) * hit;
    }
  }

  return asked > 0 ? Math.min(1, answered / asked) : 0;
};

const unsteady = (variation: Variation) =>
  `Passes as drawn, but fails ${variation.total - variation.passed} of ${variation.total} runs with traffic and capacity varied${variation.worst?.message ? `; in run ${variation.worstSeed}: ${variation.worst.message}` : "."}`;

export const judgeCheck = (
  check: CheckRef,
  context: Context,
): { passed: boolean; evidence: string; ratio?: number } => {
  switch (check.check) {
    case "serves-reads": {
      const outcome = context.drill(check.drillId);

      if (!outcome?.result) {
        return { passed: false, evidence: `No load drill ${check.drillId}.` };
      }

      const share = readShare(context.graph, outcome.result, check.nodeKind);
      const shown = `${Math.round(share * 100)}%`;
      const servers = context.graph.nodes.filter(
        (node) => node.kind === check.nodeKind,
      );

      if (servers.length === 0) {
        return {
          passed: false,
          evidence: `No ${check.nodeKind} answers any reads; the design has none.`,
        };
      }

      return share >= check.minShare
        ? {
            passed: true,
            evidence: `${servers.map(labelOf).join(", ")} answer${servers.length === 1 ? "s" : ""} ${shown} of the reads.`,
          }
        : {
            passed: false,
            evidence: `${servers.map(labelOf).join(", ")} answer${servers.length === 1 ? "s" : ""} ${shown} of the reads; the check needs ${Math.round(check.minShare * 100)}%.`,
          };
    }
    case "within-budget": {
      const outcome = context.drill(check.drillId);

      if (!outcome?.result) {
        return { passed: false, evidence: `No load drill ${check.drillId}.` };
      }

      if (!outcome.passed) {
        const drill = context.drillTitle(check.drillId);

        return {
          passed: false,
          evidence: `The budget is checked once “${drill}” passes; a design that does not work yet costs nothing worth comparing.`,
        };
      }

      const estimate = costOf(context.graph, averageLoads(outcome.result));
      const top = [...estimate.nodes]
        .filter((item) => item.monthlyUsd > 0)
        .sort((a, b) => b.monthlyUsd - a.monthlyUsd)
        .slice(0, 2)
        .map((item) => {
          const found = context.graph.nodes.find(
            (node) => node.id === item.nodeId,
          );

          return `${found ? labelOf(found) : item.nodeId} ${dollars(item.monthlyUsd)}`;
        });

      return estimate.monthlyUsd <= check.monthlyUsd
        ? {
            passed: true,
            evidence: `Costs about ${dollars(estimate.monthlyUsd)} a month, within ${dollars(check.monthlyUsd)}.`,
          }
        : {
            passed: false,
            evidence: `Costs about ${dollars(estimate.monthlyUsd)} a month, over the ${dollars(check.monthlyUsd)} budget; most of it is ${top.join(" and ")}.`,
          };
    }
    case "chaos-coverage": {
      const results = context.chaos();
      const statuses = results.map((item) =>
        statusOf(item.outcome?.passed ?? false, item.variation),
      );
      const survived = statuses.filter((status) => status === "passed").length;
      const unsure = statuses.filter((status) => status === "flaky").length;
      const coverage =
        results.length === 0
          ? 0
          : (survived + unsure * FLAKY_SHARE) / results.length;
      const ratio = Math.min(1, coverage / check.min);
      const first = results.find((_, index) => statuses[index] !== "passed");

      if (results.length === 0) {
        return {
          passed: false,
          evidence: "The design has nothing to fail yet.",
          ratio: 0,
        };
      }

      if (results[0]?.skipped) {
        return { passed: false, evidence: results[0].skipped, ratio: 0 };
      }

      return {
        passed: coverage >= check.min,
        evidence: first
          ? `Survives ${survived} of ${results.length} faults drawn from the design${unsure > 0 ? `, and ${unsure} only sometimes` : ""}; not always “${first.chaos.title}”.`
          : `Survives all ${results.length} faults drawn from the design.`,
        ratio,
      };
    }
    case "drill-passes": {
      const outcome = context.drill(check.drillId);

      if (!outcome)
        return { passed: false, evidence: `No drill ${check.drillId}.` };

      if (!outcome.passed) {
        return {
          passed: false,
          evidence: outcome.failures[0] ?? "The drill failed.",
        };
      }

      const variation = context.variation(check.drillId);

      return statusOf(true, variation) === "flaky"
        ? {
            passed: false,
            evidence: unsteady(variation!),
            ratio: FLAKY_SHARE,
          }
        : { passed: true, evidence: "The drill passed." };
    }
    case "no-finding-under-drill": {
      const found = context
        .drill(check.drillId)
        ?.findings.find((finding) => finding.kind === check.finding);

      return found
        ? { passed: false, evidence: found.message }
        : {
            passed: true,
            evidence: `No ${check.finding} finding under the drill.`,
          };
    }
    case "has-node-kind": {
      const drawn = selectNodes(context.graph, {
        nodeKind: check.nodeKind,
        role: "any",
      });
      const drillId = check.drillId ?? context.baselineId;
      const result =
        catalogue[check.nodeKind].carriesTraffic && drillId
          ? context.drill(drillId)?.result
          : undefined;
      const working = drawn.filter((node) =>
        takesPart(context.graph, node.id, result),
      );
      const plural = (count: number) =>
        `${count} ${check.nodeKind} node${count === 1 ? "" : "s"}`;

      if (working.length >= check.min) {
        return {
          passed: true,
          evidence: `The design has ${plural(working.length)} that take part.`,
        };
      }

      if (drawn.length >= check.min) {
        return {
          passed: false,
          evidence: `The design draws ${plural(drawn.length)}, but only ${working.length} ${
            result
              ? "receive any requests"
              : "are connected to anything or placed anywhere"
          }; it needs ${check.min}.`,
        };
      }

      return {
        passed: false,
        evidence: `The design needs at least ${plural(check.min)} and has ${drawn.length}.`,
      };
    }
    case "throttles": {
      const throttler = context.graph.nodes.find(
        (node) =>
          node.kind === "rate-limiter" ||
          (node.kind === "api-gateway" && node.props.throttle.enabled),
      );

      return throttler
        ? {
            passed: true,
            evidence: `${throttler.label || throttler.id} limits what gets through.`,
          }
        : {
            passed: false,
            evidence:
              "Nothing limits the traffic: add a rate limiter, or turn on throttling in a gateway.",
          };
    }
    case "watches": {
      const watched = selectNodes(context.graph, {
        nodeKind: check.nodeKind,
        role: "any",
      });
      const unwatched = watched.filter(
        (target) =>
          !context.graph.edges.some((edge) => {
            const source = context.graph.nodes.find(
              (item) => item.id === edge.from,
            );

            return (
              edge.kind === "watches" &&
              edge.to === target.id &&
              source?.kind === "alert" &&
              source.props.signal === check.signal
            );
          }),
      );

      if (watched.length === 0) {
        return {
          passed: false,
          evidence: `The design has no ${check.nodeKind} to watch.`,
        };
      }

      const unscraped = watched.filter(
        (target) =>
          !context.graph.edges.some(
            (edge) => edge.kind === "scrapes" && edge.to === target.id,
          ),
      );

      if (unwatched.length === 0 && unscraped.length > 0) {
        return {
          passed: false,
          evidence: `An alert watches ${unscraped.map((item) => item.label || item.id).join(", ")}, but nothing scrapes its metrics, so it can never fire.`,
        };
      }

      return unwatched.length === 0
        ? {
            passed: true,
            evidence: `An alert on ${check.signal} watches every ${check.nodeKind}.`,
          }
        : {
            passed: false,
            evidence: `No alert on ${check.signal} watches ${unwatched.map((item) => item.label || item.id).join(", ")}.`,
          };
    }
    case "no-lint": {
      if (!serves(context.graph)) {
        return {
          passed: false,
          evidence: "The design does not serve any traffic yet.",
        };
      }

      const hit = runLints(context.graph).find(
        (item) => item.lint === check.lint,
      );

      return hit
        ? { passed: false, evidence: hit.message }
        : { passed: true, evidence: "The check finds nothing." };
    }
  }
};

export const scoreSubmission = (
  problem: ProblemContent,
  graph: DesignGraph,
  runner: DrillRunner = drillRunner(problem, graph),
): Score => {
  const { drill } = runner;
  const items = problem.rubric.map((item: RubricItem): ItemScore => ({
    key: item.key,
    title: item.title,
    weight: item.weight,
    ...judgeCheck(item.check, runner),
  }));
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items.reduce(
    (sum, item) => sum + item.weight * (item.ratio ?? (item.passed ? 1 : 0)),
    0,
  );

  return {
    score: total === 0 ? 0 : Math.round((earned / total) * 100),
    items,
    drills: problem.drills.map((item) => {
      const outcome = drill(item.id)!;

      return {
        id: item.id,
        title: item.title,
        visibility: item.visibility,
        passed:
          outcome.passed &&
          statusOf(true, runner.variation(item.id)) === "passed",
        failures: outcome.failures,
      };
    }),
  };
};
