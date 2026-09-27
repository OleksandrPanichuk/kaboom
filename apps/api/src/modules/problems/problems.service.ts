import { checkPublishable } from "@repo/design";
import { OFFICIAL_PROBLEMS } from "@repo/design/library";

import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import { ProblemsRepository, type SyncOutcome } from "./ports";
import type {
  ProblemVersionEntity,
  ProblemWithContent,
} from "./problem.entity";
import { hashProblem } from "./problem.hash";
import { ProblemNotFoundError } from "./problems.errors";

export class ProblemsService extends Service {
  private readonly problems = makeRepository(ProblemsRepository);

  public async getPublished(slug: string): Promise<ProblemWithContent> {
    const found = await this.problems.findPublishedBySlug(slug);

    if (!found) throw new ProblemNotFoundError("Problem not found");

    return found;
  }

  public async getVersion(
    problemId: string,
    version: number,
  ): Promise<ProblemVersionEntity> {
    const found = await this.problems.findVersion(problemId, version);

    if (!found) throw new ProblemNotFoundError("Problem version not found");

    return found;
  }

  public async syncOfficial(): Promise<Record<string, SyncOutcome>> {
    const outcomes: Record<string, SyncOutcome> = {};

    for (const content of OFFICIAL_PROBLEMS) {
      const check = checkPublishable(content);

      if (!check.ok) {
        throw new Error(
          `Official problem ${content.slug} is not publishable: ${check.issues.join(" ")}`,
        );
      }

      outcomes[content.slug] = await this.problems.syncOfficial({
        content: check.problem,
        contentHash: hashProblem(check.problem),
      });
    }

    return outcomes;
  }
}
