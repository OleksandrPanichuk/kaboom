import { defineRoute } from "@/core/route";
import { SimulationRunEntity, SimulationRunModel } from "@/modules/simulations";

import { RunInterviewSimulationInput } from "../dto";
import { INTERVIEW_SIMULATION_RATE_LIMIT } from "../interviews.constants";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const runInterviewSimulationRoute = ({
  runInterviewSimulation,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: RunInterviewSimulationInput,
    response: SimulationRunModel,
    summary: "Run the interview's design under a scenario",
    auth: true,
    rateLimit: INTERVIEW_SIMULATION_RATE_LIMIT,

    action: ({ params, body, user }) =>
      runInterviewSimulation.execute({
        ownerId: user.id,
        id: params.id,
        scenario: body.scenario,
      }),
    postAction: ({ output }) => SimulationRunEntity.normalize(output),
  });
