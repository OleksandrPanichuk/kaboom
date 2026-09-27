import { defineRoute } from "@/core/route";

import { RunSimulationInput } from "../dto";
import { SimulationRunEntity } from "../simulation-run.entity";
import { SimulationRunModel } from "../simulation-run.model";
import { SIMULATION_RUN_RATE_LIMIT } from "../simulations.constants";
import type { SimulationsActions } from "../simulations.routes";
import { SimulationsParams } from "./simulation-params";

export const runSimulationRoute = ({ runSimulation }: SimulationsActions) =>
  defineRoute({
    params: SimulationsParams,
    body: RunSimulationInput,
    response: SimulationRunModel,
    summary: "Run a design under a load scenario and keep the result",
    description:
      "Evaluates the design's current revision, or the one named, and stores the findings. Answers 422 SIMULATION_SCENARIO_INVALID for a scenario the evaluator refuses or a fault on a node the design does not have.",
    auth: true,
    rateLimit: SIMULATION_RUN_RATE_LIMIT,

    action: ({ params, body, user }) =>
      runSimulation.execute({
        ownerId: user.id,
        designId: params.id,
        scenario: body.scenario,
        revision: body.revision,
      }),
    postAction: ({ output }) => SimulationRunEntity.normalize(output),
  });
