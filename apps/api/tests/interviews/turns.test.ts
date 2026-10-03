import type { DesignOp } from "@repo/design";
import { OFFICIAL_PROBLEMS } from "@repo/design/library";
import { createUser, type TestClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import type { MemoryErrorReporter } from "@/adapters/error-reporting/memory.error-reporter";
import type { ScriptedLanguageModel } from "@/adapters/llm/scripted.language-model";
import { ErrorReporter } from "@/core/error-reporting";
import { make, makeRepository } from "@/core/registry";
import {
  BUDGET_MESSAGE,
  EvidenceNotesRepository,
  FAILURE_MESSAGE,
  InterviewerTurnsRepository,
  TurnScheduler,
} from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";
import { LanguageModel, UsageLedger } from "@/platform/llm";

import { reviewAnswer } from "../reviews/helpers";
import {
  type InterviewBody,
  openEvents,
  PATH,
  startInterview,
} from "./helpers";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;

const model = () => make(LanguageModel) as ScriptedLanguageModel;
const scheduler = () => make(TurnScheduler);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const say = (user: TestClient, id: string, body: string) =>
  user.post(`${PATH}/${id}/messages`, { body });

const interviewOf = async (user: TestClient, id: string) =>
  (await user.get<InterviewBody>(`${PATH}/${id}`)).body;

const spoken = async (user: TestClient, id: string) =>
  (await interviewOf(user, id)).messages
    .filter((message) => message.author === "interviewer")
    .map((message) => message.body);

const lastUserText = (index: number) => {
  const request = model().requests[index]!;
  const last = request.messages.at(-1)!;

  return last.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");
};

const toolResults = (index: number) =>
  model()
    .requests[index]!.messages.flatMap((message) => message.content)
    .filter((part) => part.type === "tool-result")
    .map((part) => (part.type === "tool-result" ? part : null)!);

const buildReference = async (user: TestClient, interview: InterviewBody) => {
  const ops: DesignOp[] = [
    ...shortener.reference.graph.nodes
      .filter((node) => node.id !== "users")
      .map((node): DesignOp => ({ op: "add-node", node })),
    ...shortener.reference.graph.edges.map((edge): DesignOp => ({
      op: "add-edge",
      edge,
    })),
  ];
  const applied = await user.post<{ revision: number }>(
    `${PATH}/${interview.id}/ops`,
    { baseRevision: 0, ops },
  );

  expect(applied.status).toBe(200);
};

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("a turn", () => {
  test("answers a message, streaming its words as deltas tagged with the turn", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const stream = await openEvents(user, interview.id, {
      since: interview.lastSeq,
    });

    model().enqueue([
      { type: "text-delta", text: "Links live" },
      { type: "text-delta", text: " forever." },
    ]);
    await say(user, interview.id, "How long do links live?");

    const seen = [];

    for (;;) {
      const event = await stream.next();

      seen.push(event);

      if (event.data.type === "message" && event.data.payload.turnId) break;
    }

    stream.close();
    await scheduler().drain();

    const deltas = seen.filter((event) => event.event === "message-delta");
    const final = seen.at(-1)!;
    const request = model().requests[0]!;

    expect(deltas.map((event) => event.data.text)).toEqual([
      "Links live",
      " forever.",
    ]);
    expect(new Set(deltas.map((event) => event.data.turnId))).toEqual(
      new Set([final.data.payload.turnId as string]),
    );
    expect(await spoken(user, interview.id)).toEqual([
      shortener.interview!.opening,
      "Links live forever.",
    ]);
    expect(request.role).toBe("interviewer");
    expect(request.system.map((block) => block.cache ?? false)).toEqual([
      true,
      true,
      false,
    ]);
    expect(request.system[1]!.text).toContain(
      shortener.interview!.facts[0]!.answer,
    );
    expect(request.tools.map((tool) => tool.name)).toContain("stay_silent");
    expect(request.tools.map((tool) => tool.name)).not.toContain("run_drill");
    expect(lastUserText(0)).toContain("How long do links live?");
  });

  test("accepts a message while a slow turn streams, and runs the next trigger after it", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    model().enqueue(
      [
        { type: "text-delta", text: "First" },
        { type: "wait", ms: 400 },
        { type: "text-delta", text: " answer." },
      ],
      [{ type: "text-delta", text: "Second answer." }],
    );
    await say(user, interview.id, "first question");
    await sleep(50);

    const started = Date.now();
    const accepted = await say(user, interview.id, "second question");
    const took = Date.now() - started;

    await scheduler().drain();

    expect(accepted.status).toBe(200);
    expect(took).toBeLessThan(300);
    expect(model().requests).toHaveLength(2);
    expect(lastUserText(1)).toContain("second question");
    expect((await spoken(user, interview.id)).slice(1)).toEqual([
      "First answer.",
      "Second answer.",
    ]);
  });

  test("an interrupt stops the turn before its remaining tool calls, and keeps what it said", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    model().enqueue(
      [
        { type: "text-delta", text: "Let me look at your design." },
        { type: "tool-use", id: "t1", name: "read_design", input: {} },
        { type: "stop", reason: "tool-use" },
      ],
      [
        { type: "wait", ms: 2_000 },
        {
          type: "tool-use",
          id: "t2",
          name: "highlight",
          input: { nodeIds: ["users"] },
        },
        { type: "stop", reason: "tool-use" },
      ],
    );
    await say(user, interview.id, "Look at this");
    await sleep(150);

    const interrupted = await user.post<{ interrupted: boolean }>(
      `${PATH}/${interview.id}/interrupt`,
      {},
    );

    await scheduler().drain();

    const stream = await openEvents(user, interview.id, { since: 0 });
    const events = [];

    for (let i = 0; i < 3; i++) events.push(await stream.nextDurable());
    stream.close();

    const after = await interviewOf(user, interview.id);
    const turns = await makeRepository(InterviewerTurnsRepository).listFor(
      interview.id,
    );

    expect(interrupted.status).toBe(202);
    expect(interrupted.body.interrupted).toBe(true);
    expect(events.map((event) => event.data.type)).toEqual([
      "message",
      "message",
      "message",
    ]);
    expect(after.lastSeq).toBe(3);
    expect(after.messages.at(-1)).toMatchObject({
      author: "interviewer",
      body: "Let me look at your design.",
    });
    expect(
      (after.messages.at(-1) as unknown as { interrupted: boolean })
        .interrupted,
    ).toBe(true);
    expect(turns.map((turn) => turn.status)).toEqual(["interrupted"]);
  });

  test("stays silent after a design change, and interjects at most once a minute", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const trigger = () =>
      user.post(`${PATH}/${interview.id}/triggers`, { kind: "design-settled" });

    model().enqueue([
      {
        type: "tool-use",
        id: "t1",
        name: "stay_silent",
        input: { reason: "still drawing" },
      },
      { type: "stop", reason: "tool-use" },
    ]);

    const first = await trigger();

    await scheduler().drain();
    await trigger();
    await scheduler().drain();

    expect(first.status).toBe(202);
    expect(model().requests).toHaveLength(1);
    expect(lastUserText(0)).toContain("stopped editing");
    expect(await spoken(user, interview.id)).toEqual([
      shortener.interview!.opening,
    ]);
  });

  test("tells the model when a tool input is wrong, and lets it carry on", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    model().enqueue(
      [
        {
          type: "tool-use",
          id: "t1",
          name: "highlight",
          input: { nodeIds: ["nope"] },
        },
        {
          type: "tool-use",
          id: "t2",
          name: "run_drill",
          input: { drillId: "normal-day" },
        },
        {
          type: "tool-use",
          id: "t3",
          name: "set_phase",
          input: { phase: "someday" },
        },
        { type: "stop", reason: "tool-use" },
      ],
      [{ type: "text-delta", text: "Go on." }],
    );
    await say(user, interview.id, "hello");
    await scheduler().drain();

    const results = toolResults(1);

    expect(results.map((result) => result.isError)).toEqual([true, true, true]);
    expect(results[0]!.content).toContain("no node nope");
    expect(results[1]!.content).toContain(
      "not available in the requirements phase",
    );
    expect(results[2]!.content).toContain("not valid");
    expect((await spoken(user, interview.id)).at(-1)).toBe("Go on.");
  });
});

describe("a whole scripted interview", () => {
  test("clarifies, builds, breaks the database in a drill, and ends in review", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    model().enqueue([
      { type: "text-delta", text: "About 10,000 requests a second." },
      {
        type: "tool-use",
        id: "n1",
        name: "note_evidence",
        input: {
          rubricKey: "clarifies-requirements",
          note: "Asked about traffic before drawing",
          quote: "What traffic should it take?",
        },
      },
      { type: "stop", reason: "tool-use" },
    ]);
    model().enqueue([]);
    await say(user, interview.id, "What traffic should it take?");
    await scheduler().drain();

    await buildReference(user, interview);

    model().enqueue(
      [
        {
          type: "tool-use",
          id: "p1",
          name: "set_phase",
          input: { phase: "deep-dive" },
        },
        { type: "stop", reason: "tool-use" },
      ],
      [
        { type: "text-delta", text: "Let's lose the database primary." },
        {
          type: "tool-use",
          id: "d1",
          name: "run_drill",
          input: { drillId: "primary-fails" },
        },
        { type: "stop", reason: "tool-use" },
      ],
      [{ type: "text-delta", text: "It held up. Why?" }],
    );
    await say(user, interview.id, "I'm ready for the deep dive.");
    await scheduler().drain();

    model().enqueue(
      [
        {
          type: "tool-use",
          id: "p2",
          name: "set_phase",
          input: { phase: "wrap-up" },
        },
        { type: "text-delta", text: "Thanks, that's all from me." },
        {
          type: "tool-use",
          id: "e1",
          name: "end_interview",
          input: { reason: "wrapped up" },
        },
        { type: "stop", reason: "tool-use" },
      ],
      reviewAnswer(),
    );
    await say(
      user,
      interview.id,
      "Failover promotes a replica within 30 seconds.",
    );
    await scheduler().drain();

    const stream = await openEvents(user, interview.id, { since: 0 });
    const after = await interviewOf(user, interview.id);
    const events = [];

    for (let i = 0; i < after.lastSeq; i++)
      events.push(await stream.nextDurable());
    stream.close();

    const drill = toolResults(4).find((result) => result.toolUseId === "d1")!;
    const simulation = events.find(
      (event) => event.data.type === "simulation",
    )!;
    const notes = await makeRepository(EvidenceNotesRepository).listFor(
      interview.id,
    );
    const design = await user.get<{ locked: boolean }>(
      `/api/designs/${interview.designId}`,
    );

    expect(
      events
        .filter((event) => event.data.type === "phase")
        .map((event) => event.data.payload.phase),
    ).toEqual(["deep-dive", "wrap-up"]);
    expect(simulation.data.payload).toMatchObject({
      requestedBy: "interviewer",
      drillId: "primary-fails",
    });
    expect(drill.content).toContain("passed");
    expect(notes.map((note) => note.rubricItemKey)).toEqual([
      "clarifies-requirements",
    ]);
    expect(notes[0]!.revision).toBe(0);
    expect(after.status).toBe("reviewed");
    expect(events.slice(-2).map((event) => event.data.type)).toEqual([
      "message",
      "status",
    ]);
    expect(events.some((event) => event.data.type === "status")).toBe(true);
    expect(design.body.locked).toBe(true);
    expect((await spoken(user, interview.id)).slice(1)).toEqual([
      "About 10,000 requests a second.",
      "Let's lose the database primary.\n\nIt held up. Why?",
      "Thanks, that's all from me.",
    ]);
  });
});

describe("the scheduler's policy", () => {
  test("does not start a turn past the daily budget, and says so once", async () => {
    const user = await createUser();
    const interview = await startInterview(user);

    await make(UsageLedger).record(user.id, {
      inputTokens: 10_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    await say(user, interview.id, "hello?");
    await scheduler().drain();
    await say(user, interview.id, "anyone there?");
    await scheduler().drain();

    const system = (await interviewOf(user, interview.id)).messages.filter(
      (message) => message.author === "system",
    );

    expect(model().requests).toHaveLength(0);
    expect(system.map((message) => message.body)).toEqual([BUDGET_MESSAGE]);
  });

  test("pauses after two failed turns in a row, and reports them", async () => {
    const user = await createUser();
    const interview = await startInterview(user);
    const boom = () => {
      throw new Error("model exploded");
    };

    model().enqueue(boom, boom);
    await say(user, interview.id, "one");
    await scheduler().drain();
    await say(user, interview.id, "two");
    await scheduler().drain();

    const system = (await interviewOf(user, interview.id)).messages.filter(
      (message) => message.author === "system",
    );
    const turns = await makeRepository(InterviewerTurnsRepository).listFor(
      interview.id,
    );

    expect(system.map((message) => message.body)).toEqual([FAILURE_MESSAGE]);
    expect(turns.map((turn) => [turn.status, turn.error])).toEqual([
      ["failed", "model exploded"],
      ["failed", "model exploded"],
    ]);
    expect((make(ErrorReporter) as MemoryErrorReporter).reports()).toHaveLength(
      2,
    );
  });

  test("speaks up when a phase runs out of time, once per phase", async () => {
    const user = await createUser();
    await startInterview(user);

    scheduler().start({ tickMs: 0, now: () => Date.now() + 6 * 60_000 });
    await scheduler().checkPhases();
    await scheduler().drain();
    await scheduler().checkPhases();
    await scheduler().drain();

    expect(model().requests).toHaveLength(1);
    expect(lastUserText(0)).toContain("used up its time");
  });
});
