import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { type BestScore, SubmissionsRepository } from "../ports";
import { pointsFor, type Rank, rankFor } from "../ranking";

export interface GetProgressUseCaseOptions {
  userId: string;
}

type Options = GetProgressUseCaseOptions;

interface Result {
  points: number;
  rank: Rank;
  problems: Array<BestScore & { points: number }>;
}

export class GetProgressUseCase extends UseCase<Options, Result> {
  private readonly submissions = makeRepository(SubmissionsRepository);

  public async execute({ userId }: Options): Promise<Result> {
    const problems = (await this.submissions.bestOfficialScores(userId)).map(
      (best) => ({
        ...best,
        points: pointsFor(best.bestScore, best.difficulty),
      }),
    );
    const points = problems.reduce((sum, problem) => sum + problem.points, 0);

    return { points, rank: rankFor(points), problems };
  }
}
