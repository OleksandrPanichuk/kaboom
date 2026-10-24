import { applyOps, type DesignGraph, type DesignOp } from "@repo/design";
import { createProUser, createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import { TurnScheduler } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";

import { buildReference, model, reviewAnswer } from "../reviews/helpers";
import { PATH, startInterview } from "./helpers";

interface Replay {
  status: string;
  messages: Array<{ id: string; author: string; body: string }>;
  events: Array<{
    seq: number;
    type: string;
    payload: Record<string, unknown>;
  }>;
  revisions: Array<{
    number: number;
    author: string;
    ops: DesignOp[];
    snapshot: DesignGraph | null;
  }>;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const replayOf = (user: Awaited<ReturnType<typeof createUser>>, id: string) =>
  user.get<Replay & { code?: string }>(`${PATH}/${id}/replay`);

describe("interview replay", () => {
  test("is refused while the interview runs", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const replay = await replayOf(user, interview.id);

    expect(replay.status).toBe(409);
    expect(replay.body.code).toBe("INTERVIEW_STILL_RUNNING");
  });

  test("holds every event in order and revisions that rebuild the final design", async () => {
    const user = await createProUser();
    const interview = await startInterview(user);

    await user.post(`${PATH}/${interview.id}/messages`, {
      body: "How many redirects a second?",
    });
    await make(TurnScheduler).drain();
    await buildReference(user, interview.id);
    model().enqueue(reviewAnswer());
    await user.post(`${PATH}/${interview.id}/submit`, {});

    const { status, body } = await replayOf(user, interview.id);

    expect(status).toBe(200);
    expect(body.status).toBe("reviewed");
    expect(body.events.map((event) => event.seq)).toEqual(
      body.events.map((_, index) => index + 1),
    );
    expect(new Set(body.events.map((event) => event.type))).toEqual(
      new Set(["message", "revision", "status"]),
    );
    expect(body.messages.map((message) => message.body)).toContain(
      "How many redirects a second?",
    );

    const [first, ...rest] = body.revisions;
    let graph = first!.snapshot!;

    for (const revision of rest) {
      const applied = applyOps(graph, revision.ops, { derive: false });

      expect(applied.ok).toBe(true);
      if (applied.ok) graph = applied.graph;
    }

    const design = await user.get<{ graph: DesignGraph }>(
      `/api/designs/${interview.designId}`,
    );

    expect(graph).toEqual(design.body.graph);
  });

  test("is the owner's alone", async () => {
    const user = await createUser();
    const other = await createUser();
    const interview = await startInterview(user);

    await user.post(`${PATH}/${interview.id}/submit`, {});

    expect((await replayOf(other, interview.id)).status).toBe(404);
  });
});
