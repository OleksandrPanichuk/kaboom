import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { ProblemsService } from "@/modules/problems";

import { SkillScoresRepository } from "./ports";
import type { SkillsView } from "./skill.entity";
import { SKILL_SCORING_VERSION } from "./skills.constants";
import {
  nextProblem,
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
        score,
        weight,
        scoringVersion: SKILL_SCORING_VERSION,
      })),
    );
  }

  public async viewFor(userId: string): Promise<SkillsView> {
    const rows = await this.scores.listFor(userId);
    const skills = summarise(rows);
    const practised = new Map<string, number>();

    for (const key of new Set(
      rows.map((row) => `${row.problemId}:${row.reviewId}`),
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

    return { skills, next: nextProblem(skills, candidates, practised) };
  }
}
