import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";

import { SimulationRunEntity } from "../simulation-run.entity";
import { SimulationRunModel } from "../simulation-run.model";
import type { SimulationsActions } from "../simulations.routes";
import { SimulationsParams } from "./simulation-params";

export const listSimulationRunsRoute = ({
  listSimulationRuns,
}: SimulationsActions) =>
  defineRoute({
    params: SimulationsParams,
    query: PageQuery,
    response: PageModel(SimulationRunModel),
    summary: "List a design's simulation runs, newest first",
    auth: true,

    action: ({ params, query, user }) =>
      listSimulationRuns.execute({
        ownerId: user.id,
        designId: params.id,
        page: toPageRequest(query),
      }),
    postAction: ({ output }) => mapPage(output, SimulationRunEntity.normalize),
  });
