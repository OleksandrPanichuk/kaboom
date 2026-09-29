import { OFFICIAL_PROBLEMS } from "@repo/design/library";
import { describe, expect, test } from "bun:test";

import { nextProblem, skillPointsOf, summarise } from "./skills.helpers";

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
