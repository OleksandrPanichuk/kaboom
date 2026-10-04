import type { DesignGraph } from "../graph";
import { runLints } from "../lints";
import {
  chaosBaseline,
  type ChaosCase,
  chaosCases,
  type ChaosOutcome,
  chaosSettings,
  runChaosCase,
} from "../testing/chaos";
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
  drill: (id: string) => DrillOutcome | undefined;
  durationOf: (id: string) => number;
  chaos: () => ChaosResult[];
}

type Context = Pick<DrillRunner, "graph" | "drill" | "chaos">;

export const drillRunner = (
  problem: ProblemContent,
  graph: DesignGraph,
): DrillRunner => {
  const outcomes = new Map<string, DrillOutcome>();
  const durations = new Map<string, number>();
  let chaos: ChaosResult[] | null = null;

  const runner: DrillRunner = {
    graph,
    chaos: () => {
      if (chaos) return chaos;

      const baseline = chaosBaseline(problem);
      const settings = chaosSettings(problem);

      if (!baseline || !settings.enabled) {
        chaos = [];

        return chaos;
      }

      const ready = runner.drill(baseline.id)?.passed ?? false;

      chaos = chaosCases(graph, settings).map((item) => {
        if (!ready) {
          return {
            chaos: item,
            outcome: null,
            skipped: `Faults are drawn once “${baseline.title}” passes; a design that fails without them says nothing new with them.`,
            durationMs: 0,
          };
        }

        const started = performance.now();
        const outcome = runChaosCase(graph, item, baseline, settings);

        return {
          chaos: item,
          outcome,
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
    durationOf: (id) => durations.get(id) ?? 0,
  };

  return runner;
};

export const judgeCheck = (
  check: CheckRef,
  context: Context,
): { passed: boolean; evidence: string; ratio?: number } => {
  switch (check.check) {
    case "chaos-coverage": {
      const results = context.chaos();
      const survived = results.filter((item) => item.outcome?.passed);
      const coverage =
        results.length === 0 ? 0 : survived.length / results.length;
      const ratio = Math.min(1, coverage / check.min);
      const first = results.find((item) => !item.outcome?.passed);

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
          ? `Survives ${survived.length} of ${results.length} faults drawn from the design; not “${first.chaos.title}”.`
          : `Survives all ${results.length} faults drawn from the design.`,
        ratio,
      };
    }
    case "drill-passes": {
      const outcome = context.drill(check.drillId);

      if (!outcome)
        return { passed: false, evidence: `No drill ${check.drillId}.` };

      return outcome.passed
        ? { passed: true, evidence: "The drill passed." }
        : {
            passed: false,
            evidence: outcome.failures[0] ?? "The drill failed.",
          };
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
