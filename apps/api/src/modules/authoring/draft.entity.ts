import type { PublishIssue } from "@repo/scoring";

import type { ProblemDraftRow, ProblemReviewRow } from "@/db";

import type {
  ProblemDraftModel,
  ProblemDraftSummaryModel,
  ProblemReviewModel,
  ProblemReviewSummaryModel,
} from "./authoring.model";

export interface DraftEntity extends ProblemDraftRow {}

export interface ReviewEntity extends ProblemReviewRow {}

export type DraftStatus =
  "draft" | "in-review" | "changes-requested" | "published";

export interface LinkedProblem {
  slug: string;
  title: string;
}

export interface DraftView {
  draft: DraftEntity;
  reviews: ReviewEntity[];
  problem: (LinkedProblem & { currentVersion: number }) | null;
  forkedFrom: LinkedProblem | null;
  issues: PublishIssue[];
}

export interface ReviewAuthor {
  handle: string;
  displayName: string;
}

export interface ReviewListing {
  review: ReviewEntity;
  update: boolean;
  author: ReviewAuthor | null;
}

export interface ReviewView extends ReviewListing {
  currentContent: unknown;
}

const textField = (content: unknown, key: string): string | null => {
  const value =
    content !== null && typeof content === "object"
      ? (content as Record<string, unknown>)[key]
      : undefined;

  return typeof value === "string" && value.trim() !== "" ? value : null;
};

export class DraftEntity {
  public static status(
    draft: DraftEntity,
    reviews: readonly ReviewEntity[],
  ): DraftStatus {
    const latest = reviews[0];

    if (latest?.status === "pending") return "in-review";
    if (latest?.status === "rejected") return "changes-requested";

    return draft.problemId ? "published" : "draft";
  }

  public static summary(
    draft: DraftEntity,
    reviews: readonly ReviewEntity[],
    problemSlug: string | null,
  ): ProblemDraftSummaryModel {
    return {
      id: draft.id,
      title: textField(draft.content, "title") ?? "Untitled problem",
      slug: textField(draft.content, "slug"),
      status: DraftEntity.status(draft, reviews),
      problemSlug,
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  public static normalize(view: DraftView): ProblemDraftModel {
    return {
      id: view.draft.id,
      content: view.draft.content,
      status: DraftEntity.status(view.draft, view.reviews),
      problem: view.problem,
      forkedFrom: view.forkedFrom,
      issues: view.issues.map(({ path, message }) => ({
        path: [...path],
        message,
      })),
      reviews: view.reviews.map((review) => ({
        id: review.id,
        status: review.status,
        feedback: review.feedback,
        submittedAt: review.submittedAt.toISOString(),
        decidedAt: review.decidedAt?.toISOString() ?? null,
      })),
      updatedAt: view.draft.updatedAt.toISOString(),
    };
  }
}

export class ReviewEntity {
  public static summary({
    review,
    update,
    author,
  }: ReviewListing): ProblemReviewSummaryModel {
    return {
      id: review.id,
      draftId: review.draftId,
      status: review.status,
      slug: review.slug,
      title: review.title,
      track: review.track,
      difficulty: review.difficulty,
      update,
      author,
      submittedAt: review.submittedAt.toISOString(),
      decidedAt: review.decidedAt?.toISOString() ?? null,
    };
  }

  public static normalize(view: ReviewView): ProblemReviewModel {
    return {
      ...ReviewEntity.summary(view),
      content: view.review.content,
      currentContent: view.currentContent,
      feedback: view.review.feedback,
    };
  }
}
