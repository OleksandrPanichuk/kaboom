import type { EvaluationResult, Finding } from "../evaluate/result";

export interface Assertion {
  label: string;
  expected: string;
  actual: string;
  passed: boolean;
  at: number | null;
  nodeIds: string[];
  message: string | null;
}

export const assertion = (
  fields: Omit<Assertion, "message" | "at" | "nodeIds"> & {
    at?: number | null;
    nodeIds?: string[];
    message: string;
  },
): Assertion => ({
  at: null,
  nodeIds: [],
  ...fields,
  message: fields.passed ? null : fields.message,
});

export const structural = (label: string, message: string): Assertion =>
  assertion({
    label,
    expected: "present",
    actual: "missing",
    passed: false,
    message,
  });

export const fromFinding = (
  finding: Finding,
  result?: EvaluationResult,
): Assertion =>
  assertion({
    label: `No ${finding.kind.replaceAll("-", " ")}`,
    expected: "none",
    actual: "found",
    passed: false,
    at: result?.steps[finding.atStep]?.t ?? null,
    nodeIds:
      finding.target.type === "node" && finding.target.id
        ? [finding.target.id]
        : [],
    message: finding.message,
  });

export const failuresOf = (assertions: readonly Assertion[]): string[] =>
  assertions.flatMap((item) => (item.message === null ? [] : [item.message]));
