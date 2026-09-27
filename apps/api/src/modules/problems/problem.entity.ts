import {
  type ProblemContent,
  type PublicProblem,
  publicProblem,
} from "@repo/design";

import type { ProblemDifficulty, ProblemSource, ProblemStatus } from "@/db";

import type { ProblemModel, ProblemSummaryModel } from "./problem.model";

export interface ProblemEntity {
  id: string;
  slug: string;
  source: ProblemSource;
  authorId: string | null;
  status: ProblemStatus;
  track: string;
  title: string;
  summary: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  currentVersion: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProblemVersionEntity {
  problemId: string;
  version: number;
  contentHash: string;
  content: ProblemContent;
  createdAt: Date;
}

export interface ProblemWithContent {
  problem: ProblemEntity;
  version: ProblemVersionEntity;
}

export class ProblemEntity {
  public static normalizeSummary(entity: ProblemEntity): ProblemSummaryModel {
    return {
      id: entity.id,
      slug: entity.slug,
      source: entity.source,
      track: entity.track,
      title: entity.title,
      summary: entity.summary,
      difficulty: entity.difficulty,
      tags: entity.tags,
      version: entity.currentVersion,
      publishedAt: entity.publishedAt?.toISOString() ?? null,
    };
  }

  public static normalize({
    problem,
    version,
  }: ProblemWithContent): ProblemModel {
    const shown: PublicProblem = publicProblem(version.content);

    return {
      ...ProblemEntity.normalizeSummary(problem),
      version: version.version,
      statement: shown.statement,
      baseline: shown.baseline,
      drills: shown.drills,
      rubric: shown.rubric,
      hints: shown.hints,
      interviewable: shown.interviewable,
    };
  }
}
