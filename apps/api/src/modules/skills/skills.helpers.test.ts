import type { InterviewDimension } from "@repo/design";
import { OFFICIAL_PROBLEMS } from "@repo/design/library";
import { describe, expect, test } from "bun:test";

import {
  nextProblem,
  nextProblems,
  skillPointsOf,
  summarise as summariseAt,
  targetDifficulty,
} from "./skills.helpers";

const NOW = new Date("2026-10-01T00:00:00Z");

const DAY = 86_400_000;

interface Row {
  skill: InterviewDimension;
  score: number;
  weight: number;
}

const summarise = (rows: Row[], daysAgo = 0) =>
  summariseAt(
    rows.map((row) => ({
      ...row,
      createdAt: new Date(NOW.getTime() - daysAgo * DAY),
    })),
    NOW,
  );

const problem = (slug: string) =>
  OFFICIAL_PROBLEMS.find((content) => content.slug === slug)!;

describe("skillPointsOf", () => {
  test("weighs a skill's scored items by their weight, and skips unscored ones", () => {
    const points = skillPointsOf([
      { dimension: "requirements", weight: 15, score: 3 },
      { dimension: "requirements", weight: 10, score: 0 },
      { dimension: "scaling", weight: 20, score: null },
      { dimension: "design", weight: 20, score: 2 },
    ]);

    expect(points.map(({ skill, weight }) => [skill, weight])).toEqual([
      ["requirements", 25],
      ["design", 20],
    ]);
    expect(points[0]!.score).toBeCloseTo(0.6);
    expect(points[1]!.score).toBeCloseTo(2 / 3);
  });
});

describe("summarise", () => {
  test("averages every review's score by weight, and leaves untouched skills null", () => {
    const skills = summarise([
      { skill: "design", score: 1, weight: 20 },
      { skill: "design", score: 0.5, weight: 20 },
      { skill: "scaling", score: 0.2, weight: 10 },
    ]);

    expect(skills.find((skill) => skill.skill === "design")).toMatchObject({
      score: 75,
      samples: 2,
    });
    expect(skills.find((skill) => skill.skill === "scaling")?.score).toBe(20);
    expect(skills.find((skill) => skill.skill === "reliability")).toMatchObject(
      { score: null, samples: 0 },
    );
  });
});

describe("nextProblem", () => {
  const shortener = { problemId: "p1", content: problem("url-shortener") };
  const plain = { problemId: "p2", content: problem("photo-uploads") };

  test("suggests an interview, never a problem without one", () => {
    const next = nextProblem(summarise([]), [plain, shortener], new Map());

    expect(next).toMatchObject({ slug: "url-shortener", skill: null });
    expect(next?.reason).toContain("not tried yet");
  });

  test("names the weakest skill once a review has scored one", () => {
    const next = nextProblem(
      summarise([
        { skill: "design", score: 0.9, weight: 20 },
        { skill: "reliability", score: 0.1, weight: 20 },
      ]),
      [shortener],
      new Map([["p1", 1]]),
    );

    expect(next).toMatchObject({ skill: "reliability" });
    expect(next?.reason).toContain("Reliability");
  });

  test("answers null when nothing can be interviewed", () => {
    expect(nextProblem(summarise([]), [plain], new Map())).toBeNull();
  });
});

describe("nextProblems", () => {
  const shortener = { problemId: "p1", content: problem("url-shortener") };
  const rollout = {
    problemId: "p2",
    content: problem("zero-downtime-rollout"),
  };

  test("suggests one interview per track", () => {
    const next = nextProblems(summarise([]), [rollout, shortener], new Map());

    expect(next.map((item) => [item.track, item.slug])).toEqual([
      ["system-design", "url-shortener"],
      ["devops", "zero-downtime-rollout"],
    ]);
  });

  test("weighs each track only by the skills its interviews score", () => {
    const next = nextProblems(
      summarise([
        { skill: "delivery", score: 0.1, weight: 20 },
        { skill: "scaling", score: 0.5, weight: 20 },
        { skill: "design", score: 0.9, weight: 20 },
      ]),
      [rollout, shortener],
      new Map(),
    );

    expect(next.map((item) => item.skill)).toEqual(["scaling", "delivery"]);
  });

  test("leaves out a track with nothing to interview", () => {
    expect(
      nextProblems(summarise([]), [shortener], new Map()).map(
        (item) => item.track,
      ),
    ).toEqual(["system-design"]);
  });
});

describe("decay", () => {
  test("weighs a review half as much every 90 days, so recent work leads the average", () => {
    const skills = summariseAt(
      [
        {
          skill: "design",
          score: 0.2,
          weight: 20,
          createdAt: new Date(NOW.getTime() - 180 * DAY),
        },
        { skill: "design", score: 0.8, weight: 20, createdAt: NOW },
      ],
      NOW,
    );

    expect(skills.find((skill) => skill.skill === "design")).toMatchObject({
      score: 68,
      samples: 2,
    });
  });

  test("leaves a lone old review its own score", () => {
    expect(
      summarise([{ skill: "scaling", score: 0.4, weight: 10 }], 400).find(
        (skill) => skill.skill === "scaling",
      )?.score,
    ).toBe(40);
  });
});

describe("targetDifficulty", () => {
  test("starts easy and climbs with the weakest skill", () => {
    expect(targetDifficulty(null)).toBe("easy");
    expect(targetDifficulty(49)).toBe("easy");
    expect(targetDifficulty(50)).toBe("medium");
    expect(targetDifficulty(80)).toBe("hard");
  });

  test("picks a problem at the weakest skill's level when the rubrics lean on it alike", () => {
    const strong = summarise([
      { skill: "requirements", score: 0.9, weight: 10 },
      { skill: "design", score: 0.9, weight: 10 },
      { skill: "scaling", score: 0.9, weight: 10 },
      { skill: "reliability", score: 0.8, weight: 10 },
      { skill: "communication", score: 0.9, weight: 10 },
    ]);
    const candidates = ["url-shortener", "news-feed", "rate-limited-api"].map(
      (slug, index) => ({ problemId: `p${index}`, content: problem(slug) }),
    );
    const next = nextProblem(strong, candidates, new Map());

    expect(next?.skill).toBe("reliability");
    expect(next?.difficulty).not.toBe("easy");
    expect(next?.reason).toContain(
      "Reliability is your weakest skill so far, at 80",
    );
  });
});
