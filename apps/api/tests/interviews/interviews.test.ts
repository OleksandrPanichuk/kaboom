import { createGroup, type DesignOp } from "@repo/design";
import { OFFICIAL_PROBLEMS } from "@repo/design/library";
import { createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import {
  hashProblem,
  ProblemsRepository,
  ProblemsService,
} from "@/modules/problems";

import { model, reviewAnswer } from "../reviews/helpers";
import {
  type InterviewBody,
  openEvents,
  PATH,
  startInterview,
} from "./helpers";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;

const addGroup: DesignOp[] = [
  {
    op: "add-group",
    group: createGroup({ id: "eu", kind: "region", label: "EU" }),
  },
];

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("starting an interview", () => {
  test("pins the problem, draws the baseline and opens with the interviewer's line", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const design = await user.get<{ graph: { nodes: Array<{ id: string }> } }>(
      `/api/designs/${interview.designId}`,
    );

    expect(interview).toMatchObject({
      status: "active",
      phase: "requirements",
      problemVersion: 1,
      lastSeq: 1,
      problem: { slug: "url-shortener", title: "URL shortener" },
    });
    expect(interview.problem.phases.map((phase) => phase.id)).toEqual([
      "requirements",
      "high-level",
      "deep-dive",
      "wrap-up",
    ]);
    expect(
      interview.messages.map(({ author, body }) => ({ author, body })),
    ).toEqual([{ author: "interviewer", body: shortener.interview!.opening }]);
    expect(design.body.graph.nodes.map((node) => node.id)).toEqual(["users"]);
  });

  test("keeps one interview running at a time, and refuses a problem without one", async () => {
    const user = await createUser();
    const first = await startInterview(user);
    const again = await user.post<{ code: string; details: unknown }>(PATH, {
      slug: "url-shortener",
    });
    const plain = await user.post<{ code: string }>(PATH, {
      slug: "photo-uploads",
    });

    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({
      code: "INTERVIEW_ALREADY_ACTIVE",
      details: { interviewId: first.id },
    });
    expect(plain.status).toBe(422);
    expect(plain.body.code).toBe("PROBLEM_NOT_INTERVIEWABLE");
  });

  test("offers an interview on every official problem written for one", () => {
    expect(
      OFFICIAL_PROBLEMS.filter((problem) => problem.interview)
        .map((problem) => problem.slug)
        .sort(),
    ).toEqual([
      "latency-regression",
      "monorepo-pipeline",
      "news-feed",
      "rate-limited-api",
      "three-tier-vpc",
      "url-shortener",
      "zero-downtime-rollout",
    ]);
  });

  test.each(
    OFFICIAL_PROBLEMS.filter((problem) => problem.interview).map((problem) => [
      problem.slug,
      problem,
    ]),
  )("starts %s with its opening", async (_, problem) => {
    const started = await startInterview(await createUser(), problem.slug);

    expect(started.messages[0]!.body).toBe(problem.interview!.opening);
  });

  test("keeps the version it started on after the problem changes", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const edited = {
      ...shortener,
      interview: { ...shortener.interview!, opening: "A different opening." },
    };

    await make(ProblemsRepository).syncOfficial({
      content: edited,
      contentHash: hashProblem(edited),
    });

    const later = await user.get<InterviewBody>(`${PATH}/${interview.id}`);
    const fresh = await startInterview(await createUser());

    expect(later.body.problemVersion).toBe(1);
    expect(later.body.messages[0]!.body).toBe(shortener.interview!.opening);
    expect(fresh.problemVersion).toBe(2);
    expect(fresh.messages[0]!.body).toBe("A different opening.");
  });
});

describe("commands", () => {
  test("record messages, design changes and runs as events, in order", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const base = `${PATH}/${interview.id}`;

    const message = await user.post<{ author: string }>(`${base}/messages`, {
      body: "How long do links live?",
    });
    const ops = await user.post<{ revision: number }>(`${base}/ops`, {
      baseRevision: 0,
      ops: addGroup,
    });
    const run = await user.post<{ id: string }>(`${base}/simulations`, {
      scenario: { kind: "load", durationSeconds: 60 },
    });
    const layout = await user.put(`${base}/layout`, {
      layout: { users: { x: 10, y: 20 } },
    });
    const events = await openEvents(user, interview.id, { since: 0 });
    const seen = [
      await events.nextDurable(),
      await events.nextDurable(),
      await events.nextDurable(),
      await events.nextDurable(),
    ];

    events.close();

    expect(message.body.author).toBe("user");
    expect(ops.body.revision).toBe(1);
    expect(run.status).toBe(200);
    expect(layout.status).toBe(200);
    expect(seen.map((event) => [event.data.seq, event.data.type])).toEqual([
      [1, "message"],
      [2, "message"],
      [3, "revision"],
      [4, "simulation"],
    ]);
    expect(seen[2]!.data.payload).toMatchObject({
      revision: 1,
      author: "user",
    });
    expect(seen[3]!.data.payload).toMatchObject({ run: { id: run.body.id } });
  });

  test("answer 404 to anyone but the owner, stream included", async () => {
    const owner = await createUser();
    const other = await createUser();
    const interview = await startInterview(owner);
    const base = `${PATH}/${interview.id}`;
    const stream = await openEvents(other, interview.id);

    stream.close();

    expect((await other.get(base)).status).toBe(404);
    expect((await other.post(`${base}/messages`, { body: "hi" })).status).toBe(
      404,
    );
    expect(
      (await other.post(`${base}/ops`, { baseRevision: 0, ops: addGroup }))
        .status,
    ).toBe(404);
    expect((await other.put(`${base}/layout`, { layout: {} })).status).toBe(
      404,
    );
    expect(
      (await other.post(`${base}/simulations`, { scenario: { kind: "load" } }))
        .status,
    ).toBe(404);
    expect((await other.post(`${base}/submit`, {})).status).toBe(404);
    expect(stream.status).toBe(404);
  });
});

describe("submitting", () => {
  test("locks the design at its revision, and a second submit changes nothing", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const base = `${PATH}/${interview.id}`;

    await user.post(`${base}/ops`, { baseRevision: 0, ops: addGroup });
    model().enqueue(reviewAnswer());

    const submitted = await user.post<{ status: string }>(`${base}/submit`, {});
    const again = await user.post<{ status: string }>(`${base}/submit`, {});
    const after = await user.get<InterviewBody>(base);
    const message = await user.post<{ code: string }>(`${base}/messages`, {
      body: "One more thing",
    });
    const direct = await user.post<{ code: string }>(
      `/api/designs/${interview.designId}/ops`,
      { baseRevision: 1, ops: [{ op: "remove-group", id: "eu" }] },
    );
    const design = await user.get<{ locked: boolean }>(
      `/api/designs/${interview.designId}`,
    );

    expect(submitted.body.status).toBe("reviewing");
    expect(again.body.status).toBe("reviewed");
    expect(after.body).toMatchObject({ status: "reviewed", finalRevision: 1 });
    expect(message.status).toBe(409);
    expect(message.body.code).toBe("INTERVIEW_NOT_ACTIVE");
    expect(direct.status).toBe(409);
    expect(direct.body.code).toBe("DESIGN_LOCKED");
    expect(design.body.locked).toBe(true);
    expect(after.body.lastSeq).toBe(4);
  });

  test("lets a new interview start once the last one is submitted", async () => {
    const user = await createUser();
    const first = await startInterview(user);

    model().enqueue(reviewAnswer());
    await user.post(`${PATH}/${first.id}/submit`, {});

    const second = await user.post(PATH, { slug: "url-shortener" });
    const list = await user.get<{
      items: Array<{ id: string; status: string }>;
    }>(PATH);

    expect(second.status).toBe(200);
    expect(list.body.items.map((item) => item.status)).toEqual([
      "active",
      "reviewed",
    ]);
  });
});

describe("the event stream", () => {
  test("replays after Last-Event-ID, then delivers live events exactly once", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const base = `${PATH}/${interview.id}`;

    await user.post(`${base}/messages`, { body: "first" });
    await user.post(`${base}/messages`, { body: "second" });

    const resumed = await openEvents(user, interview.id, { lastEventId: 1 });
    const replayed = [await resumed.nextDurable(), await resumed.nextDurable()];

    await user.post(`${base}/messages`, { body: "live" });

    const live = await resumed.nextDurable();

    resumed.close();

    expect(replayed.map((event) => event.id)).toEqual(["2", "3"]);
    expect(live).toMatchObject({ id: "4", event: "message" });
  });
});
