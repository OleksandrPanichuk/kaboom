import type { DesignGraph, DrillScore, ItemScore } from "@repo/design";

import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { ProblemDifficulty } from "@/db";

import type { SubmissionEntity } from "../submission.entity";

export interface CreateSubmissionData {
  attemptId: string;
  userId: string;
  problemId: string;
  problemVersion: number;
  designId: string;
  revision: number;
  graphHash: string;
  score: number;
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

export abstract class SubmissionsRepository extends Repository {
  public abstract insert(data: CreateSubmissionData): Promise<SubmissionEntity>;

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
