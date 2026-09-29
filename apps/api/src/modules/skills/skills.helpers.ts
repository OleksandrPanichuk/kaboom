import {
  INTERVIEW_DIMENSIONS,
  type InterviewDimension,
  type ProblemContent,
} from "@repo/design";

import type {
  NextProblem,
  SkillScoreEntity,
  SkillSummary,
} from "./skill.entity";
import { DIFFICULTY_ORDER, SKILL_LABELS } from "./skills.constants";

export interface ScoredItem {
  dimension: InterviewDimension;
  weight: number;
  score: number | null;
}

export interface SkillPoint {
  skill: InterviewDimension;
  score: number;
  weight: number;
}

export const MAX_ITEM_SCORE = 3;

export const skillPointsOf = (items: readonly ScoredItem[]): SkillPoint[] =>
  INTERVIEW_DIMENSIONS.flatMap((skill) => {
    const scored = items.filter(
      (item) => item.dimension === skill && item.score !== null,
    );
    const weight = scored.reduce((sum, item) => sum + item.weight, 0);

    if (weight === 0) return [];

    const earned = scored.reduce(
      (sum, item) => sum + (item.weight * item.score!) / MAX_ITEM_SCORE,
      0,
    );

    return [{ skill, score: earned / weight, weight }];
  });

export const summarise = (
  rows: ReadonlyArray<Pick<SkillScoreEntity, "skill" | "score" | "weight">>,
): SkillSummary[] =>
  INTERVIEW_DIMENSIONS.map((skill) => {
    const own = rows.filter((row) => row.skill === skill);
    const weight = own.reduce((sum, row) => sum + row.weight, 0);

    return {
      skill,
      label: SKILL_LABELS[skill],
      score:
        weight === 0
          ? null
          : Math.round(
              (100 *
                own.reduce((sum, row) => sum + row.score * row.weight, 0)) /
                weight,
            ),
      samples: own.length,
    };
  });

export interface Candidate {
  problemId: string;
  content: ProblemContent;
}

const emphasis = (content: ProblemContent, skill: InterviewDimension) => {
  const rubric = content.interview?.rubric ?? [];
  const total = rubric.reduce((sum, item) => sum + item.weight, 0);
  const own = rubric
    .filter((item) => item.dimension === skill)
    .reduce((sum, item) => sum + item.weight, 0);

  return total === 0 ? 0 : own / total;
};

export const nextProblem = (
  skills: readonly SkillSummary[],
  candidates: readonly Candidate[],
  practised: ReadonlyMap<string, number>,
): NextProblem | null => {
  const interviewable = candidates.filter(({ content }) => content.interview);

  if (interviewable.length === 0) return null;

  const weakest =
    skills
      .filter((summary) => summary.score !== null)
      .sort((a, b) => a.score! - b.score!)[0] ?? null;
  const ranked = [...interviewable].sort(
    (a, b) =>
      (practised.get(a.problemId) ?? 0) - (practised.get(b.problemId) ?? 0) ||
      (weakest
        ? emphasis(b.content, weakest.skill) -
          emphasis(a.content, weakest.skill)
        : 0) ||
      DIFFICULTY_ORDER[a.content.difficulty] -
        DIFFICULTY_ORDER[b.content.difficulty] ||
      a.content.title.localeCompare(b.content.title),
  );
  const pick = ranked[0]!;
  const tried = (practised.get(pick.problemId) ?? 0) > 0;

  return {
    slug: pick.content.slug,
    title: pick.content.title,
    difficulty: pick.content.difficulty,
    skill: weakest?.skill ?? null,
    reason: weakest
      ? `${weakest.label} is your weakest skill so far, and this interview leans on it.`
      : tried
        ? "Try it again: a second interview shows what has improved."
        : "Start here: an interview you have not tried yet.",
  };
};
