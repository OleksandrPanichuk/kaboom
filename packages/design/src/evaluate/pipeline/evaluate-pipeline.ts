import type { DesignGraph, DesignNode } from "../../graph";
import type { Finding, PipelineResult, StageTiming } from "../result";
import {
  type PipelineScenarioInput,
  PipelineScenarioSchema,
} from "../scenario";

export const RUNNER_SETUP_MINUTES = 1;

type Stage = Extract<DesignNode, { kind: "pipeline-stage" }>;

const round = (value: number) => Math.round(value * 100) / 100;

const minutesOf = (stage: Stage, changedShare: number): number => {
  const { durationMinutes, parallelism, affectedOnly, flakiness, retries } =
    stage.props;

  if (stage.props.stage === "approve") return durationMinutes;

  const work = durationMinutes * (affectedOnly ? changedShare : 1);
  const once =
    work / parallelism + (parallelism > 1 ? RUNNER_SETUP_MINUTES : 0);
  const attempts =
    flakiness >= 1
      ? retries + 1
      : (1 - flakiness ** (retries + 1)) / (1 - flakiness);

  return once * attempts;
};

const failChanceOf = (stage: Stage): number =>
  stage.props.stage === "approve"
    ? 0
    : stage.props.flakiness ** (stage.props.retries + 1);

export const evaluatePipeline = (
  graph: DesignGraph,
  input: PipelineScenarioInput,
): PipelineResult => {
  const { changedShare } = PipelineScenarioSchema.parse(input);
  const stages = graph.nodes.filter(
    (node): node is Stage => node.kind === "pipeline-stage",
  );
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  const before = new Map<string, string[]>(
    stages.map((stage) => [stage.id, []]),
  );

  for (const edge of graph.edges) {
    if (edge.kind === "pipeline-next" && byId.has(edge.from)) {
      before.get(edge.to)?.push(edge.from);
    }
  }

  const timings = new Map<string, StageTiming>();
  const timingOf = (id: string): StageTiming => {
    const known = timings.get(id);

    if (known) return known;

    const stage = byId.get(id)!;
    const start = Math.max(
      0,
      ...(before.get(id) ?? []).map((previous) => timingOf(previous).end),
    );
    const timing = {
      id,
      start: round(start),
      end: round(start + minutesOf(stage, changedShare)),
      failChance: failChanceOf(stage),
    };

    timings.set(id, timing);

    return timing;
  };

  const ancestors = (id: string, seen = new Set<string>()): Set<string> => {
    for (const previous of before.get(id) ?? []) {
      if (!seen.has(previous)) {
        seen.add(previous);
        ancestors(previous, seen);
      }
    }

    return seen;
  };

  const findings: Finding[] = [];

  for (const stage of stages) {
    if (stage.props.stage !== "deploy") continue;

    const earlier = [...ancestors(stage.id)].map(
      (id) => byId.get(id)!.props.stage,
    );
    const label = stage.label || stage.id;

    if (!earlier.includes("test")) {
      findings.push({
        target: { type: "node", id: stage.id },
        kind: "untested-deploy",
        atStep: 0,
        message: `${label} ships changes no test stage has run against.`,
        data: {},
      });
    }

    if (!earlier.includes("scan")) {
      findings.push({
        target: { type: "node", id: stage.id },
        kind: "unscanned-deploy",
        atStep: 0,
        message: `${label} ships changes no security scan has looked at.`,
        data: {},
      });
    }
  }

  const ordered = stages.map((stage) => timingOf(stage.id));

  return {
    leadTimeMinutes: round(Math.max(0, ...ordered.map((item) => item.end))),
    greenRate: ordered.reduce((rate, item) => rate * (1 - item.failChance), 1),
    stages: ordered,
    findings,
  };
};
