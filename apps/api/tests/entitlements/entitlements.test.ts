import {
  createGuest,
  createProUser,
  createUser,
  grantPro,
  type TestClient,
} from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import { TurnScheduler } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";

import { PATH, startInterview } from "../interviews/helpers";
import { model, reviewAnswer } from "../reviews/helpers";

interface Entitlements {
  plan: string;
  source: string | null;
  interviews: { limit: number; per: string };
  fullReview: boolean;
  replay: boolean;
}

interface Quota {
  limit: number;
  per: string;
  used: number;
  resetsAt: string;
}

interface PlanLimit {
  code: string;
  details: { feature: string; limit?: number; per?: string; resetsAt?: string };
}

interface ReviewBody {
  detail: string;
  strengths: string[];
  improvements: string[];
  items: Array<{
    score: number | null;
    rationale: string;
    citations: unknown[];
  }>;
  drills: unknown[];
}

const quota = (user: TestClient) => user.get<Quota>(`${PATH}/quota`);

const endInterview = async (user: TestClient, id: string) => {
  model().enqueue(reviewAnswer());
  await user.post(`${PATH}/${id}/submit`, {});
  await make(TurnScheduler).drain();
};

const reviewedInterview = async (user: TestClient) => {
  const interview = await startInterview(user);

  await user.post(`${PATH}/${interview.id}/messages`, {
    body: "How many redirects a second should it take?",
  });
  await make(TurnScheduler).drain();
  await endInterview(user, interview.id);

  return interview;
};

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("what a plan includes", () => {
  test("a new account is on Free, with one interview a week and no replay", async () => {
    const user = await createUser();
    const { status, body } = await user.get<Entitlements>(
      "/api/entitlements/me",
    );

    expect(status).toBe(200);
    expect(body).toEqual({
      plan: "free",
      source: null,
      interviews: { limit: 1, per: "week" },
      fullReview: false,
      replay: false,
    });
  });

  test("Pro has three interviews a day, full reviews and replay", async () => {
    const user = await createProUser();
    const { body } = await user.get<Entitlements>("/api/entitlements/me");

    expect(body).toEqual({
      plan: "pro",
      source: "lifetime",
      interviews: { limit: 3, per: "day" },
      fullReview: true,
      replay: true,
    });
  });

  test("asks for a session", async () => {
    const response = await createGuest().get("/api/entitlements/me");

    expect(response.status).toBe(401);
  });
});

describe("the interview allowance", () => {
  test("Free gets one interview a week, and the second is a 402 that says when it resets", async () => {
    const user = await createUser();
    const first = await startInterview(user);

    expect((await quota(user)).body).toMatchObject({
      limit: 1,
      per: "week",
      used: 1,
    });

    await endInterview(user, first.id);

    const second = await user.post<PlanLimit>(PATH, { slug: "url-shortener" });

    expect(second.status).toBe(402);
    expect(second.body.code).toBe("PLAN_LIMIT");
    expect(second.body.details).toMatchObject({
      feature: "interviews",
      limit: 1,
      per: "week",
    });
    expect(new Date(second.body.details.resetsAt!).getUTCDay()).toBe(1);
  });

  test("a refused start creates nothing", async () => {
    const user = await createUser();
    const first = await startInterview(user);

    await endInterview(user, first.id);
    await user.post(PATH, { slug: "url-shortener" });

    expect((await quota(user)).body.used).toBe(1);
  });

  test("Pro gets three a day, and the fourth is refused", async () => {
    const user = await createProUser();

    for (let i = 0; i < 3; i += 1) {
      const interview = await startInterview(user);

      expect(interview.status).toBe("active");
      await endInterview(user, interview.id);
    }

    const fourth = await user.post<PlanLimit>(PATH, { slug: "url-shortener" });

    expect(fourth.status).toBe(402);
    expect(fourth.body.details).toMatchObject({ limit: 3, per: "day" });
    expect((await quota(user)).body).toMatchObject({ used: 3, per: "day" });
  });

  test("an interview still running is reported before the allowance", async () => {
    const user = await createUser();
    const first = await startInterview(user);
    const again = await user.post<{ code: string }>(PATH, {
      slug: "url-shortener",
    });

    expect(again.status).toBe(409);
    expect(again.body.code).toBe("INTERVIEW_ALREADY_ACTIVE");
    expect(first.status).toBe("active");
  });

  test("one person's interviews do not use up another's", async () => {
    const busy = await createUser();
    const idle = await createUser();

    await startInterview(busy);

    expect((await quota(idle)).body.used).toBe(0);
  });
});

describe("a review on Free", () => {
  test("keeps every score and the design's results, and drops what only a close reading needs", async () => {
    const user = await createUser();
    const interview = await reviewedInterview(user);
    const { body } = await user.get<ReviewBody>(
      `${PATH}/${interview.id}/review`,
    );

    expect(body.detail).toBe("summary");
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((item) => item.score !== null)).toBe(true);
    expect(body.items.every((item) => item.rationale === "")).toBe(true);
    expect(body.items.every((item) => item.citations.length === 0)).toBe(true);
    expect(body.strengths.length).toBeLessThanOrEqual(3);
    expect(body.drills.length).toBeGreaterThan(0);
  });

  test("is whole for Pro, citations included", async () => {
    const user = await createProUser();
    const interview = await reviewedInterview(user);
    const { body } = await user.get<ReviewBody>(
      `${PATH}/${interview.id}/review`,
    );

    expect(body.detail).toBe("full");
    expect(body.items.every((item) => item.rationale !== "")).toBe(true);
    expect(body.items[0]!.citations.length).toBeGreaterThan(0);
  });

  test("is stored whole, so upgrading shows what was held back", async () => {
    const user = await createUser();
    const interview = await reviewedInterview(user);
    const before = await user.get<ReviewBody>(`${PATH}/${interview.id}/review`);

    await grantPro(user);

    const after = await user.get<ReviewBody>(`${PATH}/${interview.id}/review`);

    expect(before.body.detail).toBe("summary");
    expect(after.body.detail).toBe("full");
    expect(after.body.items[0]!.rationale).not.toBe("");
  });
});

describe("replay", () => {
  test("is Pro's: Free is told so", async () => {
    const user = await createUser();
    const interview = await reviewedInterview(user);
    const replay = await user.get<PlanLimit>(`${PATH}/${interview.id}/replay`);

    expect(replay.status).toBe(402);
    expect(replay.body.code).toBe("PLAN_LIMIT");
    expect(replay.body.details.feature).toBe("replay");
  });

  test("opens for Pro", async () => {
    const user = await createProUser();
    const interview = await reviewedInterview(user);
    const replay = await user.get(`${PATH}/${interview.id}/replay`);

    expect(replay.status).toBe(200);
  });

  test("an interview still running cannot be replayed, whatever the plan", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const replay = await user.get<{ code: string }>(
      `${PATH}/${interview.id}/replay`,
    );

    expect(replay.status).toBe(409);
    expect(replay.body.code).toBe("INTERVIEW_STILL_RUNNING");
  });
});
