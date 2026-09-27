import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import {
  type BestScore,
  SolutionRevealsRepository,
  SubmissionsRepository,
} from "../ports";
import { pointsFor, type Rank, rankFor } from "../ranking";
import { SubmissionsService } from "../submissions.service";

export interface GetProgressUseCaseOptions {
  userId: string;
}

type Options = GetProgressUseCaseOptions;

interface Result {
  points: number;
  rank: Rank;
  problems: Array<
    Omit<BestScore, "problemId"> & {
      points: number;
      lockedUntil: string | null;
    }
  >;
}

export class GetProgressUseCase extends UseCase<Options, Result> {
  private readonly submissions = makeRepository(SubmissionsRepository);

  private readonly reveals = makeRepository(SolutionRevealsRepository);

  private readonly service = makeService(SubmissionsService);

  public async execute({ userId }: Options): Promise<Result> {
    const [scores, reveals] = await Promise.all([
      this.submissions.bestOfficialScores(userId),
      this.reveals.listForUser(userId),
    ]);
    const revealedAt = new Map(
      reveals.map((reveal) => [reveal.problemId, reveal.revealedAt]),
    );
    const problems = scores.map(({ problemId, ...best }) => ({
      ...best,
      points: pointsFor(best.bestScore, best.difficulty),
      lockedUntil:
        this.service
          .lockedUntil(revealedAt.get(problemId) ?? null)
          ?.toISOString() ?? null,
    }));
    const points = problems.reduce((sum, problem) => sum + problem.points, 0);

    return { points, rank: rankFor(points), problems };
  }
}
