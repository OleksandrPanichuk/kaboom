import { FINDING_KINDS } from "@repo/design";
import { t } from "elysia";

export const SimulationFindingModel = t.Object({
  target: t.Object({
    type: t.UnionEnum(["node", "edge", "graph"]),
    id: t.Optional(t.String()),
  }),
  kind: t.UnionEnum(FINDING_KINDS),
  atStep: t.Integer(),
  message: t.String(),
  data: t.Record(t.String(), t.Number()),
});
export type SimulationFindingModel = typeof SimulationFindingModel.static;

export const SimulationClientSummaryModel = t.Object({
  minAvailability: t.Number(),
  maxP99: t.Number(),
});
export type SimulationClientSummaryModel =
  typeof SimulationClientSummaryModel.static;

export const SimulationSummaryModel = t.Object({
  steps: t.Integer(),
  stepSeconds: t.Integer(),
  clients: t.Record(t.String(), SimulationClientSummaryModel),
});
export type SimulationSummaryModel = typeof SimulationSummaryModel.static;

export const SimulationRunModel = t.Object({
  id: t.String({ format: "uuid" }),
  designId: t.String({ format: "uuid" }),
  revision: t.Integer(),
  graphHash: t.String(),
  scenario: t.Unknown(),
  findings: t.Array(SimulationFindingModel),
  summary: SimulationSummaryModel,
  createdAt: t.String({ format: "date-time" }),
});
export type SimulationRunModel = typeof SimulationRunModel.static;
