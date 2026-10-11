import type { Track } from "@repo/design";

import type { PageRequest } from "@/core/pagination";
import type { Page } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { ProblemDifficulty, ProblemReviewStatus } from "@/db";

import type { ReviewEntity, ReviewListing } from "../draft.entity";

export interface CreateReviewData {
  draftId: string;
  authorId: string;
  slug: string;
  title: string;
  track: Track;
  difficulty: ProblemDifficulty;
  content: unknown;
  contentHash: string;
}

export interface ReviewDecision {
  status: Exclude<ProblemReviewStatus, "pending">;
  reviewerId: string | null;
  feedback: string | null;
  content?: unknown;
  difficulty?: ProblemDifficulty;
}

export abstract class ProblemReviewsRepository extends Repository {
  public abstract insertPending(
    data: CreateReviewData,
  ): Promise<ReviewEntity | null>;

  public abstract findById(id: string): Promise<ReviewEntity | null>;

  public abstract findListing(id: string): Promise<ReviewListing | null>;

  public abstract listForDraft(draftId: string): Promise<ReviewEntity[]>;

  public abstract listForDrafts(
    draftIds: readonly string[],
  ): Promise<ReviewEntity[]>;

  public abstract list(
    status: ProblemReviewStatus,
    page: PageRequest,
  ): Promise<Page<ReviewListing>>;

  public abstract decide(
    id: string,
    decision: ReviewDecision,
  ): Promise<ReviewEntity | null>;
}
