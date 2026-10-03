import { createGuest, createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import { TurnScheduler } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";

import { PATH, startInterview } from "../interviews/helpers";
import { model, reviewAnswer } from "../reviews/helpers";
import { buildReference, start } from "../submissions/helpers";

interface Activity {
  items: Array<{
    kind: string;
    problem: { slug: string };
    score: number | null;
    counted: boolean;
    reviewStatus: string | null;
  }>;
  totals: { interviewsReviewed: number; averageInterviewScore: number | null };
}

interface History {
  halfLifeDays?: number;
  points: Array<{ skill: string; score: number; source: string }>;
}

const designReview = [
  {
    type: "tool-use" as const,
    id: "design-review",
    name: "submit_design_review",
    input: {
      summary: "A balanced design.",
      strengths: ["Caches redirects."],
      improvements: ["Plan the failover."],
      items: (["design", "scaling", "reliability"] as const).map(
        (dimension) => ({ dimension, score: 3, rationale: "Strong." }),
      ),
    },
  },
];

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("progress", () => {
  test("is empty before anything is reviewed or submitted", async () => {
    const user = await createUser();
    const activity = await user.get<Activity>("/api/progress/activity");
    const history = await user.get<History>("/api/skills/me/history");

    expect(activity.body).toEqual({
      items: [],
      totals: { interviewsReviewed: 0, averageInterviewScore: null },
    });
    expect(history.body).toEqual({ points: [], halfLifeDays: 90 });
  });

  test("lists reviewed interviews and submissions newest first, with the skills they moved", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    await user.post(`${PATH}/${interview.id}/messages`, { body: "Hello." });
    await make(TurnScheduler).drain();
    model().enqueue(reviewAnswer());
    await user.post(`${PATH}/${interview.id}/submit`, {});

    const attempt = await start(user);
    const revision = await buildReference(user, attempt);

    model().enqueue(designReview);
    await user.post("/api/problems/url-shortener/submissions", { revision });

    const activity = await user.get<Activity>("/api/progress/activity");
    const history = await user.get<History>("/api/skills/me/history");

    expect(activity.body.items).toMatchObject([
      {
        kind: "challenge",
        problem: { slug: "url-shortener" },
        score: 100,
        counted: true,
        reviewStatus: "reviewed",
      },
      {
        kind: "interview",
        problem: { slug: "url-shortener" },
        score: 67,
        reviewStatus: null,
      },
    ]);
    expect(activity.body.totals).toEqual({
      interviewsReviewed: 1,
      averageInterviewScore: 67,
    });
    expect(
      history.body.points.filter((point) => point.source === "challenge"),
    ).toHaveLength(3);
    expect(history.body.points[0]).toMatchObject({
      source: "interview",
      score: 67,
    });
  });

  test("belongs to the signed-in user", async () => {
    expect((await createGuest().get("/api/progress/activity")).status).toBe(
      401,
    );
    expect((await createGuest().get("/api/skills/me/history")).status).toBe(
      401,
    );
  });
});
