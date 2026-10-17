import type { Track } from "@repo/design";
import type { InterviewDimension } from "@repo/scoring";

import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { ProblemsService } from "@/modules/problems";

import { SkillScoresRepository } from "./ports";
import type { PlanPick, SkillSummary, SkillsView } from "./skill.entity";
import {
  SKILL_SCORING_VERSION,
  SUBMISSION_SKILL_WEIGHT,
} from "./skills.constants";
import {
  type Candidate,
  nextProblems,
  planProblems,
  type ScoredItem,
  skillPointsOf,
  summarise,
} from "./skills.helpers";

export interface RecordReviewSkills {
  userId: string;
  problemId: string;
  interviewId: string;
  reviewId: string;
  items: readonly ScoredItem[];
}

export interface RecordSubmissionSkills {
  userId: string;
  problemId: string;
  submissionId: string;
  items: ReadonlyArray<{ dimension: InterviewDimension; score: number }>;
}

export class SkillsService extends Service {
  private readonly scores = makeRepository(SkillScoresRepository);

  private readonly problems = makeService(ProblemsService);

  public recordReview({
    userId,
    problemId,
    interviewId,
    reviewId,
    items,
  }: RecordReviewSkills): Promise<void> {
    return this.scores.insertMany(
      skillPointsOf(items).map(({ skill, score, weight }) => ({
        userId,
        skill,
        problemId,
        interviewId,
        reviewId,
        submissionId: null,
        score,
        weight,
        scoringVersion: SKILL_SCORING_VERSION,
      })),
    );
  }

  public recordSubmission({
    userId,
    problemId,
    submissionId,
    items,
  }: RecordSubmissionSkills): Promise<void> {
    return this.scores.insertMany(
      skillPointsOf(
        items.map((item) => ({ ...item, weight: SUBMISSION_SKILL_WEIGHT })),
      ).map(({ skill, score, weight }) => ({
        userId,
        skill,
        problemId,
        interviewId: null,
        reviewId: null,
        submissionId,
        score,
        weight,
        scoringVersion: SKILL_SCORING_VERSION,
      })),
    );
  }

  public async summaryFor(userId: string): Promise<SkillSummary[]> {
    return summarise(await this.scores.listFor(userId), new Date());
  }

  public async viewFor(userId: string): Promise<SkillsView> {
    const { skills, practised, candidates } = await this.standing(userId);

    return { skills, next: nextProblems(skills, candidates, practised) };
  }

  public async planFor(
    userId: string,
    track: Track,
    count: number,
    attempts: ReadonlyMap<string, number> = new Map(),
  ): Promise<PlanPick> {
    const { skills, practised, candidates } = await this.standing(userId);

    for (const [problemId, times] of attempts) {
      practised.set(problemId, (practised.get(problemId) ?? 0) + times);
    }

    return planProblems(skills, candidates, practised, track, count);
  }

  private async standing(userId: string): Promise<{
    skills: SkillSummary[];
    practised: Map<string, number>;
    candidates: Candidate[];
  }> {
    const rows = await this.scores.listFor(userId);
    const practised = new Map<string, number>();

    for (const key of new Set(
      rows.map((row) => `${row.problemId}:${row.reviewId ?? row.submissionId}`),
    )) {
      const problemId = key.split(":")[0]!;

      practised.set(problemId, (practised.get(problemId) ?? 0) + 1);
    }

    const candidates = (await this.problems.listPublishedContent()).map(
      ({ problem, version }) => ({
        problemId: problem.id,
        content: version.content,
      }),
    );

    return { skills: summarise(rows, new Date()), practised, candidates };
  }
}
