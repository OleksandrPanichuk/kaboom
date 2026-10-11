import type { Finding, FindingKind } from "../evaluate/result";
import type { DesignGraph } from "../graph";
import { lints } from "../lints";

const STRUCTURAL_LINTS = [
  ["no-primary-key", "keyless-table"],
  ["fk-type-mismatch", "fk-type-mismatch"],
  ["set-null-not-nullable", "set-null-not-nullable"],
  ["engine-unsupported", "engine-unsupported"],
] as const satisfies ReadonlyArray<readonly [keyof typeof lints, FindingKind]>;

export const structuralFindings = (graph: DesignGraph): Finding[] =>
  STRUCTURAL_LINTS.flatMap(([lint, kind]) =>
    lints[lint].run(graph).map((hit): Finding => ({
      target:
        hit.edgeIds.length > 0
          ? { type: "edge", id: hit.edgeIds[0]! }
          : { type: "node", id: hit.nodeIds[0]! },
      kind,
      atStep: 0,
      message: hit.message,
      data: {},
    })),
  );
