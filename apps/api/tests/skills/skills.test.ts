import { createGuest, createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make, makeRepository } from "@/core/registry";
import { TurnScheduler } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";
import { GenerateReviewJob } from "@/modules/reviews";
import { SkillScoresRepository } from "@/modules/skills";

import { PATH, startInterview } from "../interviews/helpers";
import { model, reviewAnswer } from "../reviews/helpers";

interface SkillsBody {
  skills: Array<{
    skill: string;
    label: string;
    score: number | null;
    samples: number;
  }>;
  next: Array<{
    track: string;
    slug: string;
    skill: string | null;
    reason: string;
  }>;
}

const reviewedInterview = async (
  scores: Record<string, number>,
  user?: Awaited<ReturnType<typeof createUser>>,
) => {
  const owner = user ?? (await createUser());
  const interview = await startInterview(owner);

  await owner.post(`${PATH}/${interview.id}/messages`, { body: "Hi." });
  await make(TurnScheduler).drain();
  model().enqueue(
    reviewAnswer(
      Object.entries(scores).map(([key, score]) => ({
        key,
        score,
        rationale: "Noted.",
        citations: score > 0 ? ["M2"] : [],
      })),
    ),
  );
  await owner.post(`${PATH}/${interview.id}/submit`, {});

  return { user: owner, interview };
};

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("skills", () => {
  test("start empty, and suggest a first interview", async () => {
    const user = await createUser();
    const skills = await user.get<SkillsBody>("/api/skills/me");

    expect(skills.status).toBe(200);
    expect(skills.body.skills.map((skill) => skill.skill)).toEqual([
      "requirements",
      "design",
      "scaling",
      "reliability",
      "delivery",
      "operability",
      "communication",
    ]);
    expect(skills.body.skills.every((skill) => skill.score === null)).toBe(
      true,
    );
    expect(skills.body.next).toMatchObject([
      { track: "system-design", slug: "url-shortener", skill: null },
      { track: "devops", slug: "zero-downtime-rollout", skill: null },
    ]);
  });

  test("follow every review, and point at the weakest", async () => {
    const all = {
      "clarifies-requirements": 3,
      "estimates-capacity": 3,
      "designs-the-core": 2,
      "scales-the-read-path": 2,
      "survives-failures": 0,
      communicates: 3,
    };
    const { user } = await reviewedInterview(all);

    await reviewedInterview({ ...all, "survives-failures": 3 }, user);

    const skills = await user.get<SkillsBody>("/api/skills/me");
    const byKey = Object.fromEntries(
      skills.body.skills.map((skill) => [skill.skill, skill]),
    );

    expect(byKey.requirements).toMatchObject({ score: 100, samples: 2 });
    expect(byKey.design).toMatchObject({ score: 67, samples: 2 });
    expect(byKey.reliability).toMatchObject({ score: 50, samples: 2 });
    expect(skills.body.next[0]).toMatchObject({
      track: "system-design",
      skill: "reliability",
    });
  });

  test("are recorded once per interview, however often the review runs", async () => {
    const { user, interview } = await reviewedInterview({
      "clarifies-requirements": 2,
    });

    await make(GenerateReviewJob).handle({ interviewId: interview.id });

    const rows = await makeRepository(SkillScoresRepository).listFor(user.id);

    expect(rows.map((row) => row.skill)).toEqual(["requirements"]);
  });

  test("need a session", async () => {
    expect((await createGuest().get("/api/skills/me")).status).toBe(401);
  });
});
