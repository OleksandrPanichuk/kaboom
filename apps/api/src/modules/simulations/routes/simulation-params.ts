import { t } from "elysia";

export const SimulationsParams = t.Object({ id: t.String({ format: "uuid" }) });

export const SimulationRunParams = t.Object({
  id: t.String({ format: "uuid" }),
  runId: t.String({ format: "uuid" }),
});
