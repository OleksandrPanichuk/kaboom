import { publicScore, scoreSubmission } from "@repo/design";

import { getEnv } from "@/configs";
import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignsService } from "@/modules/designs";
import {
  describeDesign,
  EvidenceNotesRepository,
  InterviewMessagesRepository,
  InterviewsRepository,
  InterviewsService,
} from "@/modules/interviews";
import { NotificationsService } from "@/modules/notifications";
import { UsersService } from "@/modules/users";

import { ReviewsRepository } from "../ports";
import type { ReviewEntity } from "../review.entity";
import { rubricScore } from "../reviewer/draft";
import { collectEvidence } from "../reviewer/evidence";
import { Reviewer } from "../reviewer/reviewer";

export interface GenerateReviewUseCaseOptions {
  interviewId: string;
}

type Options = GenerateReviewUseCaseOptions;
type Result = ReviewEntity | null;

export class GenerateReviewUseCase extends UseCase<Options, Result> {
  private readonly reviews = makeRepository(ReviewsRepository);

  private readonly rows = makeRepository(InterviewsRepository);

  private readonly messages = makeRepository(InterviewMessagesRepository);

  private readonly notes = makeRepository(EvidenceNotesRepository);

  private readonly interviews = makeService(InterviewsService);

  private readonly designs = makeService(DesignsService);

  private readonly reviewer = makeService(Reviewer);

  public async execute({ interviewId }: Options): Promise<Result> {
    const existing = await this.reviews.findByInterview(interviewId);

    if (existing) return existing;

    const interview = await this.rows.findById(interviewId);

    if (interview?.status !== "reviewing") return null;

    const pinned = await this.interviews.pinned(interview);
    const design = await this.designs.getOwned(
      interview.designId,
      interview.ownerId,
    );
    const shown = publicScore(
      pinned.content,
      scoreSubmission(pinned.content, design.graph),
    );
    const evidence = collectEvidence({
      messages: await this.messages.listFor(interviewId),
      notes: await this.notes.listFor(interviewId),
      checks: shown.items,
      drills: shown.drills,
    });
    const written = await this.reviewer.write({
      pinned,
      evidence,
      design: describeDesign(design.graph, design.revision),
      userId: interview.ownerId,
    });

    const review = await this.interviews.commit(interviewId, async (emit) => {
      const reviewed = await this.rows.transition(
        interviewId,
        "reviewing",
        "reviewed",
      );

      if (!reviewed) return null;

      const inserted = await this.reviews.insert({
        interviewId,
        userId: interview.ownerId,
        problemId: interview.problemId,
        problemVersion: interview.problemVersion,
        revision: design.revision,
        score: rubricScore(written.items),
        designScore: shown.score,
        ...written,
        checks: shown.items,
        drills: shown.drills,
      });

      await emit("status", { status: reviewed.status });

      return inserted;
    });

    if (review) await this.notify(interview.ownerId, interviewId);

    return review ?? (await this.reviews.findByInterview(interviewId));
  }

  private async notify(userId: string, interviewId: string): Promise<void> {
    const user = await makeService(UsersService).findById(userId);

    if (!user) return;

    await makeService(NotificationsService).sendReviewReady({
      userId,
      email: user.email,
      name: user.name ?? undefined,
      reviewUrl: new URL(
        `/interviews/${interviewId}`,
        getEnv().APP_URL,
      ).toString(),
    });
  }
}
