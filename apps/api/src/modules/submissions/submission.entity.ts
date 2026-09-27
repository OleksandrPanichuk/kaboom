import type { DrillScore, ItemScore } from "@repo/design";

import type { AttemptModel, SubmissionModel } from "./submission.model";

export interface AttemptEntity {
  id: string;
  userId: string;
  problemId: string;
  problemVersion: number;
  designId: string;
  createdAt: Date;
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
  items: ItemScore[];
  drills: DrillScore[];
  createdAt: Date;
}

export class AttemptEntity {
  public static normalize(entity: AttemptEntity): AttemptModel {
    return {
      designId: entity.designId,
      problemVersion: entity.problemVersion,
      createdAt: entity.createdAt.toISOString(),
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
      items: entity.items,
      drills: entity.drills,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
