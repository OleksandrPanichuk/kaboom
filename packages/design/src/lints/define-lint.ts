import type { DesignGraph } from "../graph";

export const LINT_SEVERITIES = ["warning", "info"] as const;

export type LintSeverity = (typeof LINT_SEVERITIES)[number];

export interface LintHit {
  lint: string;
  severity: LintSeverity;
  message: string;
  nodeIds: string[];
  edgeIds: string[];
}

export interface LintDefinition<Id extends string = string> {
  id: Id;
  title: string;
  severity: LintSeverity;
  run: (graph: DesignGraph) => Array<Omit<LintHit, "lint" | "severity">>;
}

export const defineLint = <const Id extends string>(
  definition: LintDefinition<Id>,
): LintDefinition<Id> => definition;
