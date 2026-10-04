import { runTests, type TestReport } from "@repo/design";

import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { RUN_SEEDS } from "../submissions.constants";
import { SubmissionsService } from "../submissions.service";

export interface RunProblemUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = RunProblemUseCaseOptions;

interface Result {
  revision: number;
  report: TestReport;
}

export class RunProblemUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(SubmissionsService);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { version, design } = await this.service.attempt(userId, slug);

    return {
      revision: design.revision,
      report: runTests(version.content, design.graph, {
        include: "public",
        seeds: RUN_SEEDS,
      }),
    };
  }
}
