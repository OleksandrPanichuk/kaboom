import type { TestReport } from "@repo/scoring";

import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignsService } from "@/modules/designs";
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

  private readonly designs = makeService(DesignsService);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { version, design } = await this.service.attempt(userId, slug);
    const { bundle } = await this.designs.bundleOf(design);

    const { report } = await this.tester.test({
      problem: version.content,
      bundle,
      include: "public",
      seeds: RUN_SEEDS,
    });

    return { revision: design.revision, report };
  }
}
