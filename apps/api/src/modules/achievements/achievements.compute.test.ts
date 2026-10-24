import { describe, expect, test } from "bun:test";

import {
  type AchievementInputs,
  computeAchievements,
  streakOf,
  type SubmissionActivity,
} from "./achievements.compute";

const at = (day: number, hour = 12) => new Date(Date.UTC(2026, 9, day, hour));

const NOW = at(20);
const TRACKS = ["system-design", "devops", "data-model"];

const submission = (
  patch: Partial<SubmissionActivity> & { at: Date },
): SubmissionActivity => ({
  problemId: "p1",
  track: "system-design",
  score: 50,
  counted: true,
  allPassed: false,
  ...patch,
});

const inputs = (patch: Partial<AchievementInputs> = {}): AchievementInputs => ({
  submissions: [],
  interviewsStarted: [],
  interviewsReviewed: [],
  problemsPublished: [],
  tracks: TRACKS,
  ...patch,
});

const badge = (patch: Partial<AchievementInputs>, key: string) =>
  computeAchievements(inputs(patch), NOW).badges.find(
    (item) => item.key === key,
  )!;

describe("streakOf", () => {
  test("is nothing without activity", () => {
    expect(streakOf([], NOW).streak).toEqual({
      current: 0,
      longest: 0,
      activeToday: false,
    });
  });

  test("counts consecutive days, and several visits in one day as one", () => {
    const { streak } = streakOf(
      [at(17, 9), at(17, 22), at(18), at(19), at(20, 1)],
      NOW,
    );

    expect(streak).toEqual({ current: 4, longest: 4, activeToday: true });
  });

  test("stays alive until the end of the day after the last one", () => {
    expect(streakOf([at(18), at(19)], NOW).streak).toEqual({
      current: 2,
      longest: 2,
      activeToday: false,
    });
  });

  test("breaks after a missed day, and remembers the longest", () => {
    const { streak } = streakOf([at(10), at(11), at(12), at(13), at(18)], NOW);

    expect(streak).toEqual({ current: 0, longest: 4, activeToday: false });
  });

  test("a day belongs to the UTC date, not to the reader's", () => {
    const late = new Date(Date.UTC(2026, 9, 19, 23, 59));
    const early = new Date(Date.UTC(2026, 9, 20, 0, 1));

    expect(streakOf([late, early], early).streak.current).toBe(2);
  });
});

describe("badges", () => {
  test("a first solve is the earliest submission that passed everything", () => {
    const solved = badge(
      {
        submissions: [
          submission({ at: at(3), allPassed: false }),
          submission({ at: at(5), allPassed: true }),
          submission({ at: at(4), allPassed: true }),
        ],
      },
      "first-solve",
    );

    expect(solved.earnedAt).toEqual(at(4));
    expect(solved.progress).toEqual({ value: 1, target: 1 });
  });

  test("nothing is earned without a solve, and progress shows how far", () => {
    const none = badge(
      { submissions: [submission({ at: at(3) })] },
      "first-solve",
    );

    expect(none.earnedAt).toBeNull();
    expect(none.progress).toEqual({ value: 0, target: 1 });
  });

  test("ten solved counts different problems once each, and is earned on the tenth", () => {
    const solves = Array.from({ length: 12 }, (_, i) =>
      submission({ problemId: `p${i % 10}`, at: at(1 + i), allPassed: true }),
    );
    const ten = badge({ submissions: solves }, "solver-10");

    expect(ten.earnedAt).toEqual(at(10));
    expect(ten.progress).toEqual({ value: 10, target: 10 });
    expect(
      badge({ submissions: solves.slice(0, 9) }, "solver-10").progress.value,
    ).toBe(9);
  });

  test("a sharp score has to be counted", () => {
    const uncounted = badge(
      { submissions: [submission({ at: at(2), score: 95, counted: false })] },
      "sharp-shooter",
    );
    const counted = badge(
      { submissions: [submission({ at: at(2), score: 90 })] },
      "sharp-shooter",
    );

    expect(uncounted.earnedAt).toBeNull();
    expect(counted.earnedAt).toEqual(at(2));
  });

  test("an all-rounder needs every track, and is earned with the last one", () => {
    const two = [
      submission({
        problemId: "a",
        track: "system-design",
        at: at(1),
        allPassed: true,
      }),
      submission({
        problemId: "b",
        track: "devops",
        at: at(2),
        allPassed: true,
      }),
    ];
    const three = [
      ...two,
      submission({
        problemId: "c",
        track: "data-model",
        at: at(6),
        allPassed: true,
      }),
    ];

    expect(badge({ submissions: two }, "every-track")).toMatchObject({
      earnedAt: null,
      progress: { value: 2, target: 3 },
    });
    expect(badge({ submissions: three }, "every-track").earnedAt).toEqual(
      at(6),
    );
  });

  test("a streak badge is earned on the day the run reaches its length", () => {
    const week = Array.from({ length: 9 }, (_, i) => at(1 + i));
    const result = badge({ interviewsStarted: week }, "streak-7");

    expect(result.earnedAt).toEqual(new Date(Date.UTC(2026, 9, 7)));
    expect(badge({ interviewsStarted: week }, "streak-30").progress).toEqual({
      value: 9,
      target: 30,
    });
  });

  test("an interview counts once its review is read, and publishing makes an author", () => {
    expect(
      badge({ interviewsReviewed: [at(9), at(4)] }, "first-interview").earnedAt,
    ).toEqual(at(4));
    expect(badge({ problemsPublished: [at(7)] }, "author").earnedAt).toEqual(
      at(7),
    );
    expect(badge({}, "author").earnedAt).toBeNull();
  });
});
