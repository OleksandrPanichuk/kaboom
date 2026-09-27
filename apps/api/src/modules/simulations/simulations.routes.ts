import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  getSimulationRunRoute,
  listSimulationRunsRoute,
  runSimulationRoute,
} from "./routes";
import type {
  GetSimulationRunUseCase,
  ListSimulationRunsUseCase,
  RunSimulationUseCase,
} from "./use-cases";

export interface SimulationsActions {
  runSimulation: Executable<RunSimulationUseCase>;
  listSimulationRuns: Executable<ListSimulationRunsUseCase>;
  getSimulationRun: Executable<GetSimulationRunUseCase>;
}

export const simulationsRoutes = (actions: SimulationsActions) =>
  new Elysia({ name: "simulations", prefix: "/designs" })
    .post("/:id/simulations", ...runSimulationRoute(actions))
    .get("/:id/simulations", ...listSimulationRunsRoute(actions))
    .get("/:id/simulations/:runId", ...getSimulationRunRoute(actions));
