import { defineRoute } from "@/core/route";

import { SimulationRunEntity } from "../simulation-run.entity";
import { SimulationRunModel } from "../simulation-run.model";
import type { SimulationsActions } from "../simulations.routes";
import { SimulationRunParams } from "./simulation-params";

export const getSimulationRunRoute = ({
  getSimulationRun,
}: SimulationsActions) =>
  defineRoute({
    params: SimulationRunParams,
    response: SimulationRunModel,
    summary: "Get one simulation run",
    auth: true,

    action: ({ params, user }) =>
      getSimulationRun.execute({
        ownerId: user.id,
        designId: params.id,
        id: params.runId,
      }),
    postAction: ({ output }) => SimulationRunEntity.normalize(output),
  });
