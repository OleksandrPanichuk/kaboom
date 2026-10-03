import { createUser, type TestClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { make } from "@/core/registry";
import { getDatabase, interviewEventsSchema, interviewsSchema } from "@/db";
import { ExpireStaleInterviewsJob, TurnScheduler } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";

import { type InterviewBody, PATH, startInterview } from "./helpers";

const HOUR_MS = 60 * 60 * 1_000;

const ago = (hours: number) => new Date(Date.now() - hours * HOUR_MS);

const age = async (id: string, hours: number) => {
  await getDatabase()
    .update(interviewsSchema)
    .set({ startedAt: ago(hours) })
    .where(eq(interviewsSchema.id, id));
  await getDatabase()
    .update(interviewEventsSchema)
    .set({ createdAt: ago(hours) })
    .where(eq(interviewEventsSchema.interviewId, id));
};

const interviewOf = async (user: TestClient, id: string) =>
  (await user.get<InterviewBody>(`${PATH}/${id}`)).body;

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("expiring idle interviews", () => {
  test("ends an active interview a day after its last event, and locks its design", async () => {
    const user = await createUser();
    const stale = await startInterview(user);

    await age(stale.id, 25);
    await make(ExpireStaleInterviewsJob).handle();

    const after = await interviewOf(user, stale.id);
    const design = await user.get<{ locked: boolean }>(
      `/api/designs/${stale.designId}`,
    );
    const [last] = await getDatabase()
      .select()
      .from(interviewEventsSchema)
      .where(eq(interviewEventsSchema.interviewId, stale.id))
      .orderBy(sql`${interviewEventsSchema.seq} desc`)
      .limit(1);

    expect(after.status).toBe("expired");
    expect(after.endedAt).not.toBeNull();
    expect(design.body.locked).toBe(true);
    expect(last).toMatchObject({
      type: "status",
      payload: { status: "expired" },
    });
  });

  test("measures idleness from the last event, not the start", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    await age(interview.id, 30);
    await user.post(`${PATH}/${interview.id}/messages`, {
      body: "Still here.",
    });
    await make(TurnScheduler).drain();
    await make(ExpireStaleInterviewsJob).handle();

    expect((await interviewOf(user, interview.id)).status).toBe("active");
  });

  test("leaves ended interviews alone", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    await user.post(`${PATH}/${interview.id}/submit`, {});
    await age(interview.id, 48);
    await make(ExpireStaleInterviewsJob).handle();

    expect((await interviewOf(user, interview.id)).status).toBe(
      "review_failed",
    );
  });
});
