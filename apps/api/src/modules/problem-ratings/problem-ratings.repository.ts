import { Repository } from "@/core/repository";

import type { RatingTally } from "./problem-rating.entity";

export abstract class ProblemRatingsRepository extends Repository {
  public abstract tally(
    problemId: string,
    userId: string,
  ): Promise<RatingTally>;

  public abstract upsert(
    problemId: string,
    userId: string,
    stars: number,
  ): Promise<void>;

  public abstract delete(problemId: string, userId: string): Promise<void>;
}
