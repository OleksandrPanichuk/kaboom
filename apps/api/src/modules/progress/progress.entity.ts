import type { SubmissionReviewStatus } from "@/db";

import type { ActivityModel } from "./progress.model";

export interface ActivityItem {
  kind: "interview" | "challenge";
  id: string;
  problem: { slug: string; title: string };
  score: number | null;
  counted: boolean;
  reviewStatus: SubmissionReviewStatus | null;
  at: Date;
}

export interface ActivityView {
  items: ActivityItem[];
  totals: {
    interviewsReviewed: number;
    averageInterviewScore: number | null;
  };
}

export class ActivityEntity {
  public static normalize({ items, totals }: ActivityView): ActivityModel {
    return {
      items: items.map((item) => ({ ...item, at: item.at.toISOString() })),
      totals,
    };
  }
}
