import type { DesignGraph } from "@repo/design";
import type { DrillScore, ItemScore, TestReport } from "@repo/scoring";

import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { ProblemDifficulty, SubmissionReviewStatus } from "@/db";
import type { ResolvedSchema } from "@/modules/designs";

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
  allPassed: boolean;
  graph: DesignGraph;
  schemas: ResolvedSchema[];
  items: ItemScore[];
  drills: DrillScore[];
  tests: TestReport;
}

export interface SharedSolution {
  score: number;
  problemVersion: number;
  graph: DesignGraph;
  schemas: Record<string, DesignGraph>;
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
  schemas: Record<string, DesignGraph>;
}

export interface RecentSubmission {
  submissionId: string;
  score: number;
  counted: boolean;
  reviewStatus: SubmissionReviewStatus;
  problem: { slug: string; title: string };
  at: Date;
}

export abstract class SubmissionsRepository extends Repository {
  public abstract listRecentForUser(
    userId: string,
    limit: number,
  ): Promise<RecentSubmission[]>;

  public abstract insert(data: CreateSubmissionData): Promise<SubmissionEntity>;

  public abstract hasPassedAll(
    userId: string,
    problemId: string,
  ): Promise<boolean>;

  public abstract countByProblem(userId: string): Promise<Map<string, number>>;

  public abstract problemsSubmittedSince(
    userId: string,
    problemIds: readonly string[],
    since: Date,
  ): Promise<Set<string>>;

  public abstract hasSubmitted(
    userId: string,
    problemId: string,
  ): Promise<boolean>;

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

  public abstract bestCountedScores(userId: string): Promise<BestScore[]>;

  public abstract countSolvers(
    problemIds: readonly string[],
    exceptUserId: string,
  ): Promise<Map<string, number>>;

  public abstract listSolutions(
    problemId: string,
    exceptUserId: string,
    minScore: number,
    limit: number,
  ): Promise<SharedSolution[]>;
}
