import type { DesignGraph } from "../graph";
import { runLints } from "../lints";
import { type DrillOutcome, runDrill } from "./drills";
import { selectNodes } from "./resolve";
import type { CheckRef, ProblemContent, RubricItem } from "./schema";

export interface ItemScore {
  key: string;
  title: string;
  weight: number;
  passed: boolean;
  evidence: string;
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

interface Context {
  graph: DesignGraph;
  drill: (id: string) => DrillOutcome | undefined;
}

const judge = (
  check: CheckRef,
  context: Context,
): { passed: boolean; evidence: string } => {
  switch (check.check) {
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
        ?.result.findings.find((finding) => finding.kind === check.finding);

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
): Score => {
  const outcomes = new Map<string, DrillOutcome>();
  const drill = (id: string) => {
    if (!outcomes.has(id)) {
      const found = problem.drills.find((item) => item.id === id);

      if (found) outcomes.set(id, runDrill(found, graph));
    }

    return outcomes.get(id);
  };
  const context: Context = { graph, drill };
  const items = problem.rubric.map((item: RubricItem): ItemScore => ({
    key: item.key,
    title: item.title,
    weight: item.weight,
    ...judge(item.check, context),
  }));
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items.reduce(
    (sum, item) => sum + (item.passed ? item.weight : 0),
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
