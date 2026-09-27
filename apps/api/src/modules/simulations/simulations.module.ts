import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { SimulationRunsRepository } from "./ports";
import { PostgresSimulationRunsRepository } from "./repositories";
import { simulationsRoutes } from "./simulations.routes";
import {
  GetSimulationRunUseCase,
  ListSimulationRunsUseCase,
  RunSimulationUseCase,
} from "./use-cases";

export const simulationsModule = defineModule({
  name: "simulations",

  register: () => {
    bind(
      SimulationRunsRepository,
      () => new PostgresSimulationRunsRepository(),
    );
  },

  routes: () =>
    simulationsRoutes({
      runSimulation: makeUseCase(RunSimulationUseCase),
      listSimulationRuns: makeUseCase(ListSimulationRunsUseCase),
      getSimulationRun: makeUseCase(GetSimulationRunUseCase),
    }),
});
