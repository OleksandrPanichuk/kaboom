import type { DesignGraph, DrillScore, ItemScore } from "@repo/design";

import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { ProblemDifficulty, SubmissionReviewStatus } from "@/db";

import type { DesignReview, SubmissionEntity } from "../submission.entity";

export interface CreateSubmissionData {
  attemptId: string;
  userId: string;
  problemId: string;
  problemVersion: number;
  designId: string;
  revision: number;
  graphHash: string;
  score: number;
  deterministicScore: number;
  reviewStatus: SubmissionReviewStatus;
  hintPenalty: number;
  counted: boolean;
  graph: DesignGraph;
  items: ItemScore[];
  drills: DrillScore[];
}

export interface SharedSolution {
  score: number;
  problemVersion: number;
  graph: DesignGraph;
  createdAt: Date;
}

export interface BestScore {
  problemId: string;
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  bestScore: number;
  submissions: number;
}

export interface CompleteReviewData {
  score: number;
  reviewScore: number;
  review: DesignReview;
  reviewModel: string;
  reviewPromptVersion: number;
}

export interface ReviewableSubmission {
  submission: SubmissionEntity;
  graph: DesignGraph | null;
}

export abstract class SubmissionsRepository extends Repository {
  public abstract insert(data: CreateSubmissionData): Promise<SubmissionEntity>;

  public abstract findById(id: string): Promise<ReviewableSubmission | null>;

  public abstract completeReview(
    id: string,
    data: CompleteReviewData,
  ): Promise<SubmissionEntity | null>;

  public abstract failReview(id: string): Promise<void>;

  public abstract list(
    userId: string,
    problemId: string,
    page: PageRequest,
  ): Promise<Page<SubmissionEntity>>;

  public abstract bestOfficialScores(userId: string): Promise<BestScore[]>;

  public abstract listSolutions(
    problemId: string,
    exceptUserId: string,
    minScore: number,
    limit: number,
  ): Promise<SharedSolution[]>;
}
