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
  budget,
  CHAOS_SEEDS,
  runCost,
  statusOf,
  type Variation,
  varied,
} from "../testing/variation";
import { type DrillOutcome, runDrill } from "./drills";
import { selectNodes } from "./resolve";
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
  drill: (id: string) => DrillOutcome | undefined;
  variation: (id: string) => Variation | null;
  durationOf: (id: string) => number;
  chaos: () => ChaosResult[];
}

type Context = Pick<DrillRunner, "graph" | "drill" | "chaos" | "variation">;

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
  const spend = budget();
  let chaos: ChaosResult[] | null = null;

  const runner: DrillRunner = {
    graph,
    seeds,
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
            ? varied(
                spend.seedsFor(wanted, runCost(graph, outcome.scenario)),
                (seed) => runChaosCase(graph, item, baseline, settings, seed),
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

          outcomes.set(id, runDrill(found, graph));
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

        variation = varied(
          spend.seedsFor(seeds, runCost(graph, outcome.scenario)),
          (seed) => runDrill(found, graph, seed),
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

const unsteady = (variation: Variation) =>
  `Passes as drawn, but fails ${variation.total - variation.passed} of ${variation.total} runs with traffic and capacity varied${variation.worst?.message ? `; in run ${variation.worstSeed}: ${variation.worst.message}` : "."}`;

export const judgeCheck = (
  check: CheckRef,
  context: Context,
): { passed: boolean; evidence: string; ratio?: number } => {
  switch (check.check) {
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
      const count = selectNodes(context.graph, {
        nodeKind: check.nodeKind,
        role: "any",
      }).length;

      return count >= check.min
        ? {
            passed: true,
            evidence: `The design has ${count} ${check.nodeKind} node${count === 1 ? "" : "s"}.`,
          }
        : {
            passed: false,
            evidence: `The design needs at least ${check.min} ${check.nodeKind} node${check.min === 1 ? "" : "s"} and has ${count}.`,
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
        passed: outcome.passed,
        failures: outcome.failures,
      };
    }),
  };
};

export const runPublicDrills = (
  problem: ProblemContent,
  graph: DesignGraph,
): DrillScore[] =>
  problem.drills
    .filter((item) => item.visibility === "public")
    .map((item) => {
      const outcome = runDrill(item, graph);

      return {
        id: item.id,
        title: item.title,
        visibility: item.visibility,
        passed: outcome.passed,
        failures: outcome.failures,
      };
    });
