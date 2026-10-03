import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import { describeDesign } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";
import { SkillsService } from "@/modules/skills";
import {
  blendedScore,
  type SubmissionEntity,
  SubmissionsRepository,
} from "@/modules/submissions";

import { DesignReviewer } from "../reviewer/design-reviewer";

export interface ReviewSubmissionUseCaseOptions {
  submissionId: string;
}

type Options = ReviewSubmissionUseCaseOptions;
type Result = SubmissionEntity | null;

export class ReviewSubmissionUseCase extends UseCase<Options, Result> {
  private readonly submissions = makeRepository(SubmissionsRepository);

  private readonly problems = makeService(ProblemsService);

  private readonly reviewer = makeService(DesignReviewer);

  public async execute({ submissionId }: Options): Promise<Result> {
    const found = await this.submissions.findById(submissionId);

    if (found?.submission.reviewStatus !== "pending" || !found.graph) {
      return null;
    }

    const { submission, graph } = found;
    const { content } = await this.problems.getVersion(
      submission.problemId,
      submission.problemVersion,
    );
    const written = await this.reviewer.write({
      content,
      design: describeDesign(graph, submission.revision),
      checks: submission.items,
      drills: submission.drills,
      userId: submission.userId,
    });

    return transaction(async () => {
      const reviewed = await this.submissions.completeReview(submissionId, {
        score: blendedScore(
          submission.deterministicScore,
          written.reviewScore,
          submission.hintPenalty,
        ),
        reviewScore: written.reviewScore,
        review: written.review,
        reviewModel: written.model,
        reviewPromptVersion: written.promptVersion,
      });

      if (reviewed) {
        await makeService(SkillsService).recordSubmission({
          userId: submission.userId,
          problemId: submission.problemId,
          submissionId,
          items: written.review.items,
        });
      }

      return reviewed;
    });
  }
}
