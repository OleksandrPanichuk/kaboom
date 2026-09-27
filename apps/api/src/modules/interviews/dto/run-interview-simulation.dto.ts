import { t } from "elysia";

export const RunInterviewSimulationInput = t.Object({
  scenario: t.Unknown(),
});
export type RunInterviewSimulationInput =
  typeof RunInterviewSimulationInput.static;
