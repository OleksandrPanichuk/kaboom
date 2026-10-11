import { createHash } from "node:crypto";

import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { DIFFICULTY_WEIGHT, MIN_SOLUTION_SCORE } from "@/modules/submissions";

import { LeaderboardRepository } from "./ports";

export class LeaderboardService extends Service {
  private readonly repository = makeRepository(LeaderboardRepository);

  public refresh(userId: string, problemId: string): Promise<void> {
    return this.repository.refresh(userId, problemId);
  }

  public refreshProblem(problemId: string): Promise<void> {
    return this.repository.refreshProblem(problemId);
  }

  public async rebuildIfStale(): Promise<boolean> {
    const fingerprint = await this.fingerprint();

    if ((await this.repository.fingerprint()) === fingerprint) return false;

    return this.repository.rebuild(fingerprint);
  }

  private async fingerprint(): Promise<string> {
    const rules = {
      weights: DIFFICULTY_WEIGHT,
      solvedAt: MIN_SOLUTION_SCORE,
      problems: await this.repository.countedRules(),
    };

    return createHash("sha256").update(JSON.stringify(rules)).digest("hex");
  }
}
