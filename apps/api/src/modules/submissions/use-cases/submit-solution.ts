import {
  hintPenalty,
  penalised,
  publicReport,
  publicScore,
} from "@repo/scoring";

import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignsService } from "@/modules/designs";
import { EntitlementsService } from "@/modules/entitlements";
import { DesignTester } from "@/platform/design-testing";
import { Metrics } from "@/platform/metrics";

import {
  ScoreBoard,
  SubmissionReviewScheduler,
  SubmissionsRepository,
} from "../ports";
import type { SubmissionEntity } from "../submission.entity";
import { SUBMIT_SEEDS } from "../submissions.constants";
import { SubmissionPendingChangesError } from "../submissions.errors";
import { passesEverything } from "../submissions.helpers";
import { SubmissionsService } from "../submissions.service";

export interface SubmitSolutionUseCaseOptions {
  userId: string;
  slug: string;
  revision?: number;
}

type Options = SubmitSolutionUseCaseOptions;
type Result = SubmissionEntity;

export class SubmitSolutionUseCase extends UseCase<Options, Result> {
  private readonly metrics = make(Metrics);

  private readonly service = makeService(SubmissionsService);

  private readonly tester = make(DesignTester);

  private readonly entitlements = makeService(EntitlementsService);

  private readonly submissions = makeRepository(SubmissionsRepository);

  private readonly designs = makeService(DesignsService);

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

    const { bundle, schemas } = await this.designs.bundleOf(design);
    const { entitlements } = await this.entitlements.of(userId);
    const { score, report } = await this.tester.test(
      {
        problem: version.content,
        bundle,
        include: "all",
        seeds: SUBMIT_SEEDS,
      },
      { priority: entitlements.priorityTests },
    );
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
      allPassed: passesEverything(report),
      graph: design.graph,
      schemas,
      items: shown.items,
      drills: shown.drills,
      tests,
    });

    await make(ScoreBoard).scored(userId, attempt.problemId);
    await make(SubmissionReviewScheduler).schedule(inserted.id);

    this.metrics.count("productEvents", 1, { event: "submission" });
    return (
      (await this.submissions.findById(inserted.id))?.submission ?? inserted
    );
  }
}
