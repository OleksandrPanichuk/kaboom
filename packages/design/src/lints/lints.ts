import type { DesignGraph } from "../graph";
import type { LintHit } from "./define-lint";
import {
  deadEndNode,
  spofCriticalPath,
  statefulBehindRoundRobin,
  syncThirdParty,
  unreachableNode,
} from "./rules";

export const lints = {
  [spofCriticalPath.id]: spofCriticalPath,
  [statefulBehindRoundRobin.id]: statefulBehindRoundRobin,
  [syncThirdParty.id]: syncThirdParty,
  [unreachableNode.id]: unreachableNode,
  [deadEndNode.id]: deadEndNode,
} as const;

export type LintId = keyof typeof lints;

export const LINT_IDS = Object.keys(lints) as LintId[];

export const runLints = (graph: DesignGraph): LintHit[] =>
  LINT_IDS.flatMap((id) => {
    const lint = lints[id];

    return lint
      .run(graph)
      .map((hit) => ({ lint: id, severity: lint.severity, ...hit }));
  });
