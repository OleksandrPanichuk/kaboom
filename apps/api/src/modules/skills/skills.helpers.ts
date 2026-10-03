import {
  INTERVIEW_DIMENSIONS,
  type InterviewDimension,
  type ProblemContent,
  TRACKS,
} from "@repo/design";

import type {
  NextProblem,
  SkillScoreEntity,
  SkillSummary,
} from "./skill.entity";
import {
  DAY_MS,
  DIFFICULTY_ORDER,
  SKILL_HALF_LIFE_DAYS,
  SKILL_LABELS,
  TARGET_DIFFICULTY,
} from "./skills.constants";

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

export const decay = (at: Date, now: Date): number =>
  0.5 **
  (Math.max(0, now.getTime() - at.getTime()) / DAY_MS / SKILL_HALF_LIFE_DAYS);

export const summarise = (
  rows: ReadonlyArray<
    Pick<SkillScoreEntity, "skill" | "score" | "weight" | "createdAt">
  >,
  now: Date,
): SkillSummary[] =>
  INTERVIEW_DIMENSIONS.map((skill) => {
    const own = rows
      .filter((row) => row.skill === skill)
      .map((row) => ({
        ...row,
        weight: row.weight * decay(row.createdAt, now),
      }));
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

export const targetDifficulty = (
  score: number | null,
): keyof typeof DIFFICULTY_ORDER =>
  score === null
    ? "easy"
    : TARGET_DIFFICULTY.find((step) => score < step.below)!.difficulty;

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
  const target = DIFFICULTY_ORDER[targetDifficulty(weakest?.score ?? null)];
  const leaning = (content: ProblemContent) =>
    weakest ? Math.round(emphasis(content, weakest.skill) * 20) : 0;
  const distance = (content: ProblemContent) =>
    Math.abs(DIFFICULTY_ORDER[content.difficulty] - target);
  const ranked = [...interviewable].sort(
    (a, b) =>
      (practised.get(a.problemId) ?? 0) - (practised.get(b.problemId) ?? 0) ||
      leaning(b.content) - leaning(a.content) ||
      distance(a.content) - distance(b.content) ||
      DIFFICULTY_ORDER[a.content.difficulty] -
        DIFFICULTY_ORDER[b.content.difficulty] ||
      a.content.title.localeCompare(b.content.title),
  );
  const pick = ranked[0]!;
  const tried = (practised.get(pick.problemId) ?? 0) > 0;

  return {
    track: pick.content.track,
    slug: pick.content.slug,
    title: pick.content.title,
    difficulty: pick.content.difficulty,
    skill: weakest?.skill ?? null,
    reason: weakest
      ? emphasis(pick.content, weakest.skill) > 0
        ? `${weakest.label} is your weakest skill so far, at ${weakest.score}, and this ${pick.content.difficulty} interview leans on it.`
        : `${weakest.label} is your weakest skill so far, at ${weakest.score}, but this is the interview you have practised least.`
      : tried
        ? "Try it again: a second interview shows what has improved."
        : "Start here: an interview you have not tried yet.",
  };
};

export const nextProblems = (
  skills: readonly SkillSummary[],
  candidates: readonly Candidate[],
  practised: ReadonlyMap<string, number>,
): NextProblem[] =>
  TRACKS.flatMap((track) => {
    const own = candidates.filter(({ content }) => content.track === track);
    const practisedHere = new Set(
      own.flatMap(({ content }) =>
        (content.interview?.rubric ?? []).map((item) => item.dimension),
      ),
    );
    const next = nextProblem(
      skills.filter((summary) => practisedHere.has(summary.skill)),
      own,
      practised,
    );

    return next ? [next] : [];
  });
