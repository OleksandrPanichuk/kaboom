import { createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import type { ScriptStep } from "@/adapters/llm/scripted.language-model";
import { make, makeRepository } from "@/core/registry";
import { ProblemsService } from "@/modules/problems";
import { ReviewSubmissionJob } from "@/modules/reviews";
import { SkillScoresRepository } from "@/modules/skills";

import { applyOps } from "../designs/helpers";
import { buildReference, start } from "../submissions/helpers";
import { model, reviewRequests } from "./helpers";

const PATH = "/api/problems/url-shortener";

interface Submission {
  id: string;
  score: number;
  deterministicScore: number;
  reviewStatus: string;
  reviewScore: number | null;
  review: {
    summary: string;
    items: Array<{ dimension: string; score: number; rationale: string }>;
  } | null;
}

const designReview = (scores: [number, number, number]): ScriptStep[] => [
  {
    type: "tool-use",
    id: "design-review-1",
    name: "submit_design_review",
    input: {
      summary: "A balanced design with a cache in front of the database.",
      strengths: ["The cache takes most redirects off the database."],
      improvements: ["Say what happens while the primary fails over."],
      items: (["reliability", "design", "scaling"] as const).map(
        (dimension, index) => ({
          dimension,
          score: scores[index],
          rationale: `The ${dimension} holds up.`,
        }),
      ),
    },
  },
];

const recordOf = (index: number) =>
  reviewRequests()
    [index]!.messages[0]!.content.map((part) =>
      part.type === "text" ? part.text : "",
    )
    .join("");

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("a challenge submission", () => {
  test("is reviewed, and its score blends the checks with the review", async () => {
    const user = await createUser();
    const attempt = await start(user);
    const revision = await buildReference(user, attempt);

    model().enqueue(designReview([3, 2, 1]));

    const submitted = await user.post<Submission>(`${PATH}/submissions`, {
      revision,
    });
    const skills = await makeRepository(SkillScoresRepository).listFor(user.id);

    expect(submitted.body).toMatchObject({
      deterministicScore: 100,
      reviewStatus: "reviewed",
      reviewScore: 67,
      score: 90,
    });
    expect(submitted.body.review?.items.map((item) => item.dimension)).toEqual([
      "design",
      "scaling",
      "reliability",
    ]);
    const bySkill = Object.fromEntries(
      skills.map((row) => [row.skill, row.score]),
    );

    expect(Object.keys(bySkill).sort()).toEqual([
      "design",
      "reliability",
      "scaling",
    ]);
    expect(bySkill.design).toBeCloseTo(2 / 3);
    expect(bySkill.scaling).toBeCloseTo(1 / 3);
    expect(bySkill.reliability).toBeCloseTo(1);
    expect(skills.every((row) => row.submissionId === submitted.body.id)).toBe(
      true,
    );
  });

  test("keeps the checks' score when the review fails", async () => {
    const user = await createUser();
    const attempt = await start(user);
    const revision = await buildReference(user, attempt);

    const submitted = await user.post<Submission>(`${PATH}/submissions`, {
      revision,
    });

    expect(submitted.body).toMatchObject({
      score: 100,
      reviewStatus: "failed",
      reviewScore: null,
      review: null,
    });
    expect(reviewRequests()).toHaveLength(2);
  });

  test("is reviewed once, however often the job runs", async () => {
    const user = await createUser();
    const attempt = await start(user);
    const revision = await buildReference(user, attempt);

    model().enqueue(designReview([2, 2, 2]));

    const submitted = await user.post<Submission>(`${PATH}/submissions`, {
      revision,
    });

    await make(ReviewSubmissionJob).handle({ submissionId: submitted.body.id });

    expect(reviewRequests()).toHaveLength(1);
    expect(
      await makeRepository(SkillScoresRepository).listFor(user.id),
    ).toHaveLength(3);
  });

  test("shows the review model a hidden drill's outcome, never its details", async () => {
    const user = await createUser();
    const attempt = await start(user);
    const revision = await buildReference(user, attempt);
    const reverted = await applyOps(user, attempt.designId, revision, [
      { op: "remove-node", id: "replica-a" },
      { op: "remove-node", id: "replica-b" },
    ]);

    model().enqueue(designReview([2, 2, 0]));
    await user.post(`${PATH}/submissions`, {
      revision: reverted.body.revision,
    });

    expect(recordOf(0)).toContain("- The database primary fails: failed\n");
    expect(recordOf(0)).not.toContain("node-down");
  });
});
