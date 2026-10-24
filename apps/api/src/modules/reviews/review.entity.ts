import type { DrillScore, InterviewDimension, ItemScore } from "@repo/scoring";

import type { ReviewModel } from "./review.model";

export type CitationKind = "message" | "note" | "drill" | "check";

export interface ReviewCitation {
  label: string;
  kind: CitationKind;
  text: string;
}

export interface ReviewItem {
  key: string;
  title: string;
  dimension: InterviewDimension;
  weight: number;
  score: number | null;
  rationale: string;
  citations: ReviewCitation[];
}

export interface ReviewEntity {
  id: string;
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
  createdAt: Date;
}

export type ReviewDetail = "full" | "summary";

export interface ReviewView extends ReviewEntity {
  detail: ReviewDetail;
}

export const SUMMARY_HIGHLIGHTS = 3;

export class ReviewEntity {
  public static asSummary(entity: ReviewEntity): ReviewView {
    return {
      ...entity,
      strengths: entity.strengths.slice(0, SUMMARY_HIGHLIGHTS),
      improvements: entity.improvements.slice(0, SUMMARY_HIGHLIGHTS),
      items: entity.items.map((item) => ({
        ...item,
        rationale: "",
        citations: [],
      })),
      detail: "summary",
    };
  }

  public static normalize(entity: ReviewView): ReviewModel {
    return {
      id: entity.id,
      interviewId: entity.interviewId,
      revision: entity.revision,
      score: entity.score,
      designScore: entity.designScore,
      summary: entity.summary,
      strengths: entity.strengths,
      improvements: entity.improvements,
      items: entity.items,
      checks: entity.checks,
      drills: entity.drills,
      createdAt: entity.createdAt.toISOString(),
      detail: entity.detail,
    };
  }
}
