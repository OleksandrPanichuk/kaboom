import { DAY } from "@/constants";

import {
  type BadgeKey,
  BADGES,
  SHARP_SCORE,
  SOLVER_TARGET,
  STREAK_TARGETS,
} from "./achievements.constants";

export interface SubmissionActivity {
  problemId: string;
  track: string;
  score: number;
  counted: boolean;
  allPassed: boolean;
  at: Date;
}

export interface AchievementInputs {
  submissions: readonly SubmissionActivity[];
  interviewsStarted: readonly Date[];
  interviewsReviewed: readonly Date[];
  problemsPublished: readonly Date[];
  tracks: readonly string[];
}

export interface Streak {
  current: number;
  longest: number;
  activeToday: boolean;
}

export interface BadgeStanding {
  key: BadgeKey;
  title: string;
  description: string;
  earnedAt: Date | null;
  progress: { value: number; target: number };
}

export interface Achievements {
  streak: Streak;
  badges: BadgeStanding[];
}

const dayOf = (at: Date): number => Math.floor(at.getTime() / DAY);

const earliest = (dates: readonly Date[]): Date | null =>
  dates.length === 0
    ? null
    : new Date(Math.min(...dates.map((date) => date.getTime())));

const runs = (days: readonly number[]): Array<{ from: number; to: number }> => {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const found: Array<{ from: number; to: number }> = [];

  for (const day of sorted) {
    const last = found.at(-1);

    if (last && day === last.to + 1) last.to = day;
    else found.push({ from: day, to: day });
  }

  return found;
};

export const streakOf = (
  activity: readonly Date[],
  now: Date,
): { streak: Streak; runs: Array<{ from: number; to: number }> } => {
  const found = runs(activity.map(dayOf));
  const today = dayOf(now);
  const last = found.at(-1);
  const alive = last !== undefined && last.to >= today - 1;

  return {
    runs: found,
    streak: {
      current: alive ? last.to - last.from + 1 : 0,
      longest: found.reduce(
        (best, run) => Math.max(best, run.to - run.from + 1),
        0,
      ),
      activeToday: last?.to === today,
    },
  };
};

const reachedAt = (
  found: ReadonlyArray<{ from: number; to: number }>,
  length: number,
): Date | null => {
  const run = found.find((item) => item.to - item.from + 1 >= length);

  return run ? new Date((run.from + length - 1) * DAY) : null;
};

export const computeAchievements = (
  inputs: AchievementInputs,
  now: Date,
): Achievements => {
  const { streak, runs: streakRuns } = streakOf(
    [...inputs.submissions.map((item) => item.at), ...inputs.interviewsStarted],
    now,
  );
  const solves = new Map<string, { track: string; at: Date }>();

  for (const item of inputs.submissions) {
    const known = solves.get(item.problemId);

    if (item.allPassed && (!known || item.at < known.at)) {
      solves.set(item.problemId, { track: item.track, at: item.at });
    }
  }

  const solvedAt = [...solves.values()]
    .map((solve) => solve.at)
    .sort((a, b) => a.getTime() - b.getTime());
  const trackSolvedAt = inputs.tracks.map((track) =>
    earliest(
      [...solves.values()]
        .filter((solve) => solve.track === track)
        .map((solve) => solve.at),
    ),
  );
  const everyTrack = trackSolvedAt.every((at) => at !== null);
  const sharp = earliest(
    inputs.submissions
      .filter((item) => item.counted && item.score >= SHARP_SCORE)
      .map((item) => item.at),
  );
  const standing: Record<
    BadgeKey,
    { earnedAt: Date | null; value: number; target: number }
  > = {
    "first-solve": {
      earnedAt: solvedAt[0] ?? null,
      value: Math.min(solvedAt.length, 1),
      target: 1,
    },
    "solver-10": {
      earnedAt: solvedAt[SOLVER_TARGET - 1] ?? null,
      value: Math.min(solvedAt.length, SOLVER_TARGET),
      target: SOLVER_TARGET,
    },
    "sharp-shooter": { earnedAt: sharp, value: sharp ? 1 : 0, target: 1 },
    "every-track": {
      earnedAt: everyTrack
        ? new Date(Math.max(...trackSolvedAt.map((at) => at.getTime())))
        : null,
      value: trackSolvedAt.filter((at) => at !== null).length,
      target: inputs.tracks.length,
    },
    "first-interview": {
      earnedAt: earliest(inputs.interviewsReviewed),
      value: Math.min(inputs.interviewsReviewed.length, 1),
      target: 1,
    },
    "streak-7": {
      earnedAt: reachedAt(streakRuns, STREAK_TARGETS[0]),
      value: Math.min(streak.longest, STREAK_TARGETS[0]),
      target: STREAK_TARGETS[0],
    },
    "streak-30": {
      earnedAt: reachedAt(streakRuns, STREAK_TARGETS[1]),
      value: Math.min(streak.longest, STREAK_TARGETS[1]),
      target: STREAK_TARGETS[1],
    },
    author: {
      earnedAt: earliest(inputs.problemsPublished),
      value: Math.min(inputs.problemsPublished.length, 1),
      target: 1,
    },
  };

  return {
    streak,
    badges: BADGES.map((badge) => ({
      key: badge.key,
      title: badge.title,
      description: badge.description,
      earnedAt: standing[badge.key].earnedAt,
      progress: {
        value: standing[badge.key].value,
        target: standing[badge.key].target,
      },
    })),
  };
};
