import type { ProblemRatingModel } from "./problem-rating.model";

export type RatingEligibility = "eligible" | "own-problem" | "needs-submission";

export interface RatingTally {
  count: number;
  total: number;
  distribution: number[];
  mine: number | null;
}

export interface ProblemRatingEntity extends RatingTally {
  eligibility: RatingEligibility;
}

export class ProblemRatingEntity {
  public static normalize(entity: ProblemRatingEntity): ProblemRatingModel {
    return {
      average:
        entity.count === 0
          ? null
          : Math.round((entity.total / entity.count) * 10) / 10,
      count: entity.count,
      distribution: entity.distribution,
      mine: entity.mine,
      eligibility: entity.eligibility,
    };
  }
}
