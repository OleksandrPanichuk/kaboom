import { flattenBundle } from "@repo/scoring";

import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";
import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import type { ShareSubject } from "@/db";
import {
  type DesignEntity,
  DesignSchemaConflictError,
  DesignsService,
} from "@/modules/designs";
import { type InterviewEntity, InterviewsService } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";
import { ProfilesRepository } from "@/modules/profiles";
import { ReviewsRepository } from "@/modules/reviews";

import type {
  SharedInterview,
  SharedOwner,
  SharedView,
  ShareEntity,
} from "./share.entity";
import { ShareNeedsReviewError, ShareNotFoundError } from "./shares.errors";
import { SharesRepository } from "./shares.repository";

const NOT_FOUND: number = HttpStatus.NotFound;

const missing = (error: unknown): boolean =>
  error instanceof ModuleError && error.status === NOT_FOUND;

export class SharesService extends Service {
  private readonly designs = makeService(DesignsService);

  private readonly interviews = makeService(InterviewsService);

  private readonly problems = makeService(ProblemsService);

  private readonly profiles = makeRepository(ProfilesRepository);

  private readonly reviews = makeRepository(ReviewsRepository);

  private readonly shares = makeRepository(SharesRepository);

  public async viewByToken(token: string): Promise<SharedView> {
    const share = await this.shares.findLiveByToken(token);

    if (!share) throw new ShareNotFoundError("This link was turned off");

    return this.view(share);
  }

  public async assertShareable(
    subject: ShareSubject,
    subjectId: string,
    ownerId: string,
  ): Promise<void> {
    if (subject === "design") {
      await this.designs.assertOwned(subjectId, ownerId);

      return;
    }

    const interview = await this.interviews.getOwned(subjectId, ownerId);

    if (interview.status !== "reviewed") {
      throw new ShareNeedsReviewError(
        "An interview can be shared once its review is ready",
      );
    }
  }

  public async view(share: ShareEntity): Promise<SharedView> {
    try {
      return share.subject === "design"
        ? await this.viewDesign(share)
        : await this.viewInterview(share);
    } catch (error) {
      if (missing(error)) {
        throw new ShareNotFoundError(
          "This shared link no longer leads anywhere",
        );
      }

      throw error;
    }
  }

  private async viewDesign(share: ShareEntity): Promise<SharedView> {
    const design = await this.designs.getOwned(share.subjectId, share.ownerId);

    return {
      share,
      title: design.name,
      kind: design.kind,
      owner: await this.ownerOf(share.ownerId),
      interview: null,
      ...(await this.drawing(design)),
    };
  }

  private async viewInterview(share: ShareEntity): Promise<SharedView> {
    const interview = await this.interviews.getOwned(
      share.subjectId,
      share.ownerId,
    );
    const [design, summary] = await Promise.all([
      this.designs.getOwned(interview.designId, share.ownerId),
      this.interviewOf(interview),
    ]);

    return {
      share,
      title: summary.problem.title,
      kind: design.kind,
      owner: await this.ownerOf(share.ownerId),
      interview: summary,
      ...(await this.drawing(design)),
    };
  }

  private async interviewOf(
    interview: InterviewEntity,
  ): Promise<SharedInterview> {
    const [review, version] = await Promise.all([
      this.reviews.findByInterview(interview.id),
      this.problems.getVersion(interview.problemId, interview.problemVersion),
    ]);

    if (!review || interview.status !== "reviewed") {
      throw new ShareNotFoundError("This interview has no review to show");
    }

    return {
      problem: {
        slug: version.content.slug,
        title: version.content.title,
        track: version.content.track,
        difficulty: version.content.difficulty,
      },
      score: review.score,
      designScore: review.designScore,
      summary: review.summary,
      strengths: review.strengths,
      improvements: review.improvements,
      items: review.items.map(
        ({ title, dimension, weight, score, rationale }) => ({
          title,
          dimension,
          weight,
          score,
          rationale,
        }),
      ),
      endedAt: interview.endedAt,
    };
  }

  private async drawing(
    design: DesignEntity,
  ): Promise<Pick<SharedView, "graph" | "layout">> {
    try {
      const { bundle } = await this.designs.bundleOf(design);

      return { graph: flattenBundle(bundle), layout: design.layout };
    } catch (error) {
      if (error instanceof DesignSchemaConflictError) {
        return { graph: design.graph, layout: design.layout };
      }

      throw error;
    }
  }

  private async ownerOf(userId: string): Promise<SharedOwner | null> {
    const profile = await this.profiles.findByUserId(userId);

    return profile?.visible
      ? {
          handle: profile.handle,
          displayName: profile.displayName,
          avatarKey: profile.avatarKey,
        }
      : null;
  }
}
