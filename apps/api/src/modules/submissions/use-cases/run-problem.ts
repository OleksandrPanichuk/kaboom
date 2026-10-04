import type { TestReport } from "@repo/design";

import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignTester } from "@/platform/design-testing";

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

  private readonly tester = make(DesignTester);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { version, design } = await this.service.attempt(userId, slug);

    const { report } = await this.tester.test({
      problem: version.content,
      graph: design.graph,
      include: "public",
      seeds: RUN_SEEDS,
    });

    return { revision: design.revision, report };
  }
}
