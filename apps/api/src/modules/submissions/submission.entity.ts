import type { DrillScore, ItemScore, RevealedHint } from "@repo/design";

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
  hints: RevealedHint[];
  hintPenalty: number;
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
  hintPenalty: number;
  items: ItemScore[];
  drills: DrillScore[];
  createdAt: Date;
}

export class AttemptEntity {
  public static normalize({
    attempt,
    hints,
    hintPenalty,
  }: AttemptView): AttemptModel {
    return {
      designId: attempt.designId,
      problemVersion: attempt.problemVersion,
      hints,
      hintPenalty,
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
      hintPenalty: entity.hintPenalty,
      items: entity.items,
      drills: entity.drills,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
