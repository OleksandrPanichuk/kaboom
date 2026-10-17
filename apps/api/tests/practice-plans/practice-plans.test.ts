import {
  createGuest,
  createUser,
  createVerifiedUser,
  inbox,
  type TestUser,
} from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make, makeService } from "@/core/registry";
import { PracticePlansService } from "@/modules/practice-plans";
import { ProblemsRepository, ProblemsService } from "@/modules/problems";
import { SkillsService } from "@/modules/skills";

import { start } from "../submissions/helpers";

const PATH = "/api/practice-plans";

interface Plan {
  id: string;
  track: string;
  skill: string | null;
  skillLabel: string | null;
  startsAt: string;
  endsAt: string;
  steps: Array<{ slug: string; title: string; done: boolean }>;
  done: number;
  total: number;
}

interface ErrorBody {
  code?: string;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const plan = (user: TestUser, track = "system-design") =>
  user.post<Plan & ErrorBody>(PATH, { track });

const current = (user: TestUser) =>
  user.get<Plan & ErrorBody>(`${PATH}/current`);

const submitTo = async (user: TestUser, slug: string) => {
  await start(user, slug);
  await user.post(`/api/problems/${slug}/submissions`, {});
};

const reminders = (user: TestUser) =>
  inbox
    .for(user.email)
    .filter((message) => /plan|to go/i.test(message.subject));

describe("practice plans", () => {
  test("plans three problems of a track for this week", async () => {
    const ada = await createUser();

    expect((await current(ada)).body.code).toBe("PRACTICE_PLAN_NOT_FOUND");

    const made = await plan(ada);

    expect(made.status).toBe(200);
    expect(made.body).toMatchObject({
      track: "system-design",
      skill: null,
      done: 0,
      total: 3,
    });
    expect(new Set(made.body.steps.map((step) => step.slug)).size).toBe(3);
    expect(new Date(made.body.startsAt).getUTCDay()).toBe(1);
    expect(
      new Date(made.body.endsAt).getTime() -
        new Date(made.body.startsAt).getTime(),
    ).toBe(7 * 24 * 60 * 60 * 1000);
    expect((await current(ada)).body.id).toBe(made.body.id);
  });

  test("marks a problem done once it is submitted to", async () => {
    const ada = await createUser();
    const { body } = await plan(ada);
    const first = body.steps[0]!.slug;

    await submitTo(ada, first);

    const after = (await current(ada)).body;

    expect(after.done).toBe(1);
    expect(after.steps.find((step) => step.slug === first)?.done).toBe(true);
  });

  test("aims at the weakest skill of the track", async () => {
    const ada = await createUser();
    const shortener =
      await make(ProblemsRepository).findBySlug("url-shortener");

    await submitTo(ada, "url-shortener");

    const submitted = await ada.get<{ items: Array<{ id: string }> }>(
      "/api/problems/url-shortener/submissions",
    );

    await makeService(SkillsService).recordSubmission({
      userId: ada.id,
      problemId: shortener!.id,
      submissionId: submitted.body.items[0]!.id,
      items: [
        { dimension: "design", score: 0.9 },
        { dimension: "scaling", score: 0.2 },
        { dimension: "reliability", score: 0.8 },
      ],
    });

    expect((await plan(ada)).body).toMatchObject({
      skill: "scaling",
      skillLabel: "Scaling",
    });
  });

  test("starting again replaces the plan, and it can be dropped", async () => {
    const ada = await createUser();
    const first = (await plan(ada)).body;
    const second = (await plan(ada, "data-model")).body;

    expect(second.id).not.toBe(first.id);
    expect((await current(ada)).body).toMatchObject({
      id: second.id,
      track: "data-model",
    });
    expect((await ada.delete(`${PATH}/current`)).status).toBe(200);
    expect((await current(ada)).status).toBe(404);
    expect((await ada.delete(`${PATH}/current`)).status).toBe(404);
  });

  test("needs a signed-in user and a real track", async () => {
    expect((await createGuest().get(`${PATH}/current`)).status).toBe(401);
    expect((await plan(await createUser(), "cooking")).status).toBe(422);
  });

  test("reminds once in the week, only while something is left", async () => {
    const ada = await createVerifiedUser();
    const grace = await createVerifiedUser();
    const service = makeService(PracticePlansService);
    const graceSteps = (await plan(grace)).body.steps;

    await plan(ada);

    for (const step of graceSteps) await submitTo(grace, step.slug);

    expect(await service.remind(new Date())).toBe(1);
    expect(reminders(ada).map((message) => message.subject)).toEqual([
      "Your practice plan is waiting",
    ]);
    expect(reminders(grace)).toHaveLength(0);
    expect(await service.remind(new Date())).toBe(0);
  });

  test("sends no reminder once reminders are off", async () => {
    const ada = await createVerifiedUser();

    await ada.patch("/api/email-preferences/me", { reminders: false });
    await plan(ada);

    expect(await makeService(PracticePlansService).remind(new Date())).toBe(0);
    expect(reminders(ada)).toHaveLength(0);
  });
});
