import { type DrillScore, runPublicDrills } from "@repo/design";

import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { SubmissionsService } from "../submissions.service";

export interface RunProblemUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = RunProblemUseCaseOptions;

interface Result {
  revision: number;
  drills: DrillScore[];
}

export class RunProblemUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(SubmissionsService);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { version, design } = await this.service.attempt(userId, slug);

    return {
      revision: design.revision,
      drills: runPublicDrills(version.content, design.graph),
    };
  }
}
