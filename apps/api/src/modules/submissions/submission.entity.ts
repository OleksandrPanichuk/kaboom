import type {
  DrillScore,
  InterviewDimension,
  ItemScore,
  RevealedHint,
  TestReport,
} from "@repo/design";

import type { SubmissionReviewStatus } from "@/db";

import type { AttemptModel, SubmissionModel } from "./submission.model";

export interface AttemptEntity {
  id: string;
  userId: string;
  problemId: string;
  problemVersion: number;
  designId: string;
  hintsRevealed: number;
  createdAt: Date;
}

export interface AttemptView {
  attempt: AttemptEntity;
  latestVersion: number;
  hints: RevealedHint[];
  hintPenalty: number;
  lockedUntil: Date | null;
}

export interface DesignReviewItem {
  dimension: InterviewDimension;
  score: number;
  rationale: string;
}

export interface DesignReview {
  summary: string;
  strengths: string[];
  improvements: string[];
  items: DesignReviewItem[];
}

export interface SubmissionEntity {
  id: string;
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
  reviewScore: number | null;
  review: DesignReview | null;
  hintPenalty: number;
  counted: boolean;
  items: ItemScore[];
  drills: DrillScore[];
  tests: TestReport | null;
  createdAt: Date;
}

export class AttemptEntity {
  public static normalize({
    attempt,
    latestVersion,
    hints,
    hintPenalty,
    lockedUntil,
  }: AttemptView): AttemptModel {
    return {
      designId: attempt.designId,
      problemVersion: attempt.problemVersion,
      latestVersion,
      hints,
      hintPenalty,
      lockedUntil: lockedUntil?.toISOString() ?? null,
      createdAt: attempt.createdAt.toISOString(),
    };
  }
}

export class SubmissionEntity {
  public static normalize(entity: SubmissionEntity): SubmissionModel {
    return {
      id: entity.id,
      designId: entity.designId,
      problemVersion: entity.problemVersion,
      revision: entity.revision,
      score: entity.score,
      deterministicScore: entity.deterministicScore,
      reviewStatus: entity.reviewStatus,
      reviewScore: entity.reviewScore,
      review: entity.review,
      hintPenalty: entity.hintPenalty,
      counted: entity.counted,
      items: entity.items,
      drills: entity.drills,
      tests: entity.tests,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
