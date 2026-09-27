import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import {
  RunSimulationUseCase,
  SimulationRunEntity,
} from "@/modules/simulations";

import { InterviewsService } from "../interviews.service";

export interface RunInterviewSimulationUseCaseOptions {
  ownerId: string;
  id: string;
  scenario: unknown;
  requestedBy?: "user" | "interviewer";
  drillId?: string;
  show?: boolean;
}

type Options = RunInterviewSimulationUseCaseOptions;
type Result = SimulationRunEntity;

export class RunInterviewSimulationUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  public async execute({
    ownerId,
    id,
    scenario,
    requestedBy = "user",
    drillId,
    show = true,
  }: Options): Promise<Result> {
    const interview = await this.service.getActive(id, ownerId);

    return this.service.commit(id, async (emit) => {
      const run = await make(RunSimulationUseCase).execute({
        ownerId,
        designId: interview.designId,
        scenario,
      });

      if (show) {
        await emit("simulation", {
          run: SimulationRunEntity.normalize(run),
          requestedBy,
          ...(drillId ? { drillId } : {}),
        });
      }

      return run;
    });
  }
}
