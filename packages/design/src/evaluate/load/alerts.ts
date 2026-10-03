import type { DesignGraph, DesignNode } from "../../graph";
import type { AlertOutcome, EvaluationStep, Finding } from "../result";
import type { LoadScenario } from "../scenario";
import { percent } from "./findings";

export const ALERT_ERROR_RATE = 0.01;

export const ALERT_SATURATION = 0.9;

type AlertNode = Extract<DesignNode, { kind: "alert" }>;

const label = (node: DesignNode | undefined, id: string): string =>
  [node?.label, id].find((value) => value) ?? id;

const breached = (
  alert: AlertNode,
  step: EvaluationStep,
  targetId: string,
  scenario: LoadScenario,
): boolean => {
  const numbers = step.nodes[targetId];

  if (!numbers) return false;

  switch (alert.props.signal) {
    case "error-rate":
      return numbers.errorRate > ALERT_ERROR_RATE;
    case "latency":
      return numbers.p99 > scenario.slo.p99Ms;
    case "saturation":
      return numbers.rho >= ALERT_SATURATION;
    case "rollout-progress":
      return numbers.rollout?.phase === "stalled";
  }
};

const describeSignal = (
  alert: AlertNode,
  target: string,
  scenario: LoadScenario,
) => {
  switch (alert.props.signal) {
    case "error-rate":
      return `${target}'s error rate stayed above ${percent(ALERT_ERROR_RATE)}`;
    case "latency":
      return `${target}'s p99 stayed above ${scenario.slo.p99Ms} ms`;
    case "saturation":
      return `${target} stayed above ${percent(ALERT_SATURATION)} of its capacity`;
    case "rollout-progress":
      return `${target}'s rollout stayed stuck`;
  }
};

export const evaluateAlerts = (
  graph: DesignGraph,
  scenario: LoadScenario,
  steps: EvaluationStep[],
): { alerts: AlertOutcome[]; findings: Finding[] } => {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const scrapeDelay = (targetId: string): number | null => {
    const intervals = graph.edges
      .filter((edge) => edge.kind === "scrapes" && edge.to === targetId)
      .map((edge) => nodes.get(edge.from))
      .flatMap((node) =>
        node?.kind === "monitoring" ? [node.props.scrapeIntervalSeconds] : [],
      );

    return intervals.length > 0 ? Math.min(...intervals) : null;
  };
  const alerts: AlertOutcome[] = [];
  const findings: Finding[] = [];

  for (const alert of graph.nodes) {
    if (alert.kind !== "alert") continue;

    const watched = graph.edges
      .filter((edge) => edge.kind === "watches" && edge.from === alert.id)
      .map((edge) => ({ id: edge.to, delay: scrapeDelay(edge.to) }))
      .filter(
        (target): target is { id: string; delay: number } =>
          target.delay !== null,
      );
    let fired: { at: number; target: string } | null = null;

    for (const target of watched) {
      let since: number | null = null;

      for (const step of steps) {
        if (!breached(alert, step, target.id, scenario)) {
          since = null;
          continue;
        }

        since ??= step.t;

        if (step.t - since >= alert.props.forSeconds) {
          const at = step.t + target.delay;

          if (at <= scenario.durationSeconds && (!fired || at < fired.at)) {
            fired = { at, target: target.id };
          }
          break;
        }
      }
    }

    alerts.push({
      alertId: alert.id,
      firedAt: fired?.at ?? null,
      scraped: watched.length > 0,
    });

    if (fired) {
      const minutes = Math.floor(fired.at / 60);
      const seconds = String(fired.at % 60).padStart(2, "0");

      findings.push({
        target: { type: "node", id: alert.id },
        kind: "alert-fired",
        atStep: Math.min(
          steps.length - 1,
          Math.floor(fired.at / scenario.stepSeconds),
        ),
        message: `${label(alert, alert.id)} paged at ${minutes}:${seconds}: ${describeSignal(alert, label(nodes.get(fired.target), fired.target), scenario)} for ${alert.props.forSeconds} s.`,
        data: { firedAt: fired.at, forSeconds: alert.props.forSeconds },
      });
    }
  }

  return { alerts, findings };
};
