import type { InterviewDimension } from "@repo/design";

export interface SkillScoreEntity {
  id: string;
  userId: string;
  skill: InterviewDimension;
  problemId: string;
  interviewId: string | null;
  reviewId: string | null;
  submissionId: string | null;
  score: number;
  weight: number;
  scoringVersion: number;
  createdAt: Date;
}

export interface SkillSummary {
  skill: InterviewDimension;
  label: string;
  score: number | null;
  samples: number;
}

export interface NextProblem {
  slug: string;
  title: string;
  difficulty: string;
  skill: InterviewDimension | null;
  reason: string;
}

export interface SkillsView {
  skills: SkillSummary[];
  next: NextProblem | null;
}
