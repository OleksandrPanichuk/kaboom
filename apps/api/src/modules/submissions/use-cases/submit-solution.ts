import {
  hintPenalty,
  penalised,
  publicReport,
  publicScore,
} from "@repo/design";

import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignTester } from "@/platform/design-testing";

import { SubmissionReviewScheduler, SubmissionsRepository } from "../ports";
import type { SubmissionEntity } from "../submission.entity";
import { SUBMIT_SEEDS } from "../submissions.constants";
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

  private readonly tester = make(DesignTester);

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

    const { score, report } = await this.tester.test({
      problem: version.content,
      graph: design.graph,
      include: "all",
      seeds: SUBMIT_SEEDS,
    });
    const shown = publicScore(version.content, score);
    const tests = publicReport(report);
    const penalty = hintPenalty(version.content, attempt.hintsRevealed);
    const lockedUntil = await this.service.lockOf(userId, attempt.problemId);

    const inserted = await this.submissions.insert({
      attemptId: attempt.id,
      userId,
      problemId: attempt.problemId,
      problemVersion: attempt.problemVersion,
      designId: design.id,
      revision: design.revision,
      graphHash: design.graphHash,
      score: penalised(shown.score, penalty),
      deterministicScore: shown.score,
      reviewStatus: "pending",
      hintPenalty: penalty,
      counted: lockedUntil === null,
      graph: design.graph,
      items: shown.items,
      drills: shown.drills,
      tests,
    });

    await make(SubmissionReviewScheduler).schedule(inserted.id);

    return (
      (await this.submissions.findById(inserted.id))?.submission ?? inserted
    );
  }
}
