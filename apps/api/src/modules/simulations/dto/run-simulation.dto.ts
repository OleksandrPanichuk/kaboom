import { t } from "elysia";

export const RunSimulationInput = t.Object({
  scenario: t.Unknown(),
  revision: t.Optional(t.Integer({ minimum: 0 })),
});
export type RunSimulationInput = typeof RunSimulationInput.static;
