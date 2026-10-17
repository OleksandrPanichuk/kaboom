import type { Track } from "@repo/design";
import {
  type ProblemContent,
  type PublicProblem,
  publicProblem,
} from "@repo/scoring";

import type { ProblemDifficulty, ProblemSource, ProblemStatus } from "@/db";

import type { ProblemModel, ProblemSummaryModel } from "./problem.model";

export interface ProblemEntity {
  id: string;
  slug: string;
  source: ProblemSource;
  authorId: string | null;
  status: ProblemStatus;
  forkedFromId: string | null;
  track: Track;
  title: string;
  summary: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  currentVersion: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  credit?: ProblemCredit;
  feedback?: ProblemFeedback;
}

export interface ProblemFeedback {
  ratingTotal: number;
  ratingCount: number;
  commentCount: number;
}

export interface ProblemCredit {
  author: { handle: string; displayName: string } | null;
  forkedFrom: { slug: string; title: string } | null;
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
  public static ratingOf(feedback: ProblemFeedback | undefined): {
    average: number | null;
    count: number;
  } {
    const count = feedback?.ratingCount ?? 0;

    return {
      average:
        feedback && count > 0
          ? Math.round((feedback.ratingTotal / count) * 10) / 10
          : null,
      count,
    };
  }

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
      author: entity.credit?.author ?? null,
      forkedFrom: entity.credit?.forkedFrom ?? null,
      rating: ProblemEntity.ratingOf(entity.feedback),
      commentCount: entity.feedback?.commentCount ?? 0,
    };
  }

  public static normalize({
    problem,
    version,
  }: ProblemWithContent): ProblemModel {
    const shown: PublicProblem = publicProblem(version.content);

    return {
      ...ProblemEntity.normalizeSummary(problem),
      title: shown.title,
      summary: shown.summary,
      difficulty: shown.difficulty,
      tags: shown.tags,
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
