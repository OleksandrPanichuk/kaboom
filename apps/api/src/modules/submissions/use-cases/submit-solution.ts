import {
  hintPenalty,
  penalised,
  publicScore,
  scoreSubmission,
} from "@repo/design";

import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { SubmissionsRepository } from "../ports";
import type { SubmissionEntity } from "../submission.entity";
import { SubmissionPendingChangesError } from "../submissions.errors";
import { SubmissionsService } from "../submissions.service";

export interface SubmitSolutionUseCaseOptions {
  userId: string;
  slug: string;
  revision?: number;
}

type Options = SubmitSolutionUseCaseOptions;
type Result = SubmissionEntity;

export class SubmitSolutionUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(SubmissionsService);

  private readonly submissions = makeRepository(SubmissionsRepository);

  public async execute({ userId, slug, revision }: Options): Promise<Result> {
    const { attempt, version, design } = await this.service.attempt(
      userId,
      slug,
    );

    if (revision !== undefined && revision !== design.revision) {
      throw new SubmissionPendingChangesError(
        "The design has moved on since that revision; submit the latest one",
        { revision: design.revision },
      );
    }

    const shown = publicScore(
      version.content,
      scoreSubmission(version.content, design.graph),
    );
    const penalty = hintPenalty(version.content, attempt.hintsRevealed);

    return this.submissions.insert({
      attemptId: attempt.id,
      userId,
      problemId: attempt.problemId,
      problemVersion: attempt.problemVersion,
      designId: design.id,
      revision: design.revision,
      graphHash: design.graphHash,
      score: penalised(shown.score, penalty),
      hintPenalty: penalty,
      items: shown.items,
      drills: shown.drills,
    });
  }
}
