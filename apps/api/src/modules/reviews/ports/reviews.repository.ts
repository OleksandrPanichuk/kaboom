import type { DrillScore, ItemScore } from "@repo/design";

import { Repository } from "@/core/repository";

import type { ReviewEntity, ReviewItem } from "../review.entity";

export interface CreateReviewData {
  interviewId: string;
  userId: string;
  problemId: string;
  problemVersion: number;
  revision: number;
  score: number | null;
  designScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  items: ReviewItem[];
  checks: ItemScore[];
  drills: DrillScore[];
  model: string;
  promptVersion: number;
  tokens: number;
}

export abstract class ReviewsRepository extends Repository {
  public abstract insert(data: CreateReviewData): Promise<ReviewEntity | null>;

  public abstract findByInterview(
    interviewId: string,
  ): Promise<ReviewEntity | null>;
}
