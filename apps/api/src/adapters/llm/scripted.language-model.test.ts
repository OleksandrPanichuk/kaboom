import { describe, expect, test } from "bun:test";

import type { LlmEvent, LlmRequest } from "@/platform/llm/ports/language-model";

import { ScriptedLanguageModel } from "./scripted.language-model";

const request = (signal = new AbortController().signal): LlmRequest => ({
  role: "interviewer",
  system: [{ text: "You interview." }],
  messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
  tools: [],
  maxOutputTokens: 1_000,
  userId: "user",
  signal,
});

const collect = async (events: AsyncIterable<LlmEvent>) => {
  const seen: LlmEvent[] = [];

  for await (const event of events) seen.push(event);

  return seen;
};

describe("ScriptedLanguageModel", () => {
  test("plays each script to one request, in order, and records the requests", async () => {
    const model = new ScriptedLanguageModel();

    model.enqueue([{ type: "text-delta", text: "Hello" }], (seen) => [
      { type: "text-delta", text: `${seen.messages.length} messages` },
    ]);

    expect(await collect(model.stream(request()))).toEqual([
      { type: "text-delta", text: "Hello" },
      { type: "stop", reason: "end" },
    ]);
    expect(await collect(model.stream(request()))).toEqual([
      { type: "text-delta", text: "1 messages" },
      { type: "stop", reason: "end" },
    ]);
    expect(model.requests).toHaveLength(2);
    expect(model.pending()).toBe(0);
  });

  test("says nothing once its scripts run out", async () => {
    expect(
      await collect(new ScriptedLanguageModel().stream(request())),
    ).toEqual([{ type: "stop", reason: "end" }]);
  });

  test("stops at an abort, even in the middle of a wait", async () => {
    const model = new ScriptedLanguageModel();
    const controller = new AbortController();

    model.enqueue([
      { type: "text-delta", text: "Let me" },
      { type: "wait", ms: 5_000 },
      { type: "tool-use", id: "t1", name: "highlight", input: {} },
    ]);

    const started = Date.now();
    const running = collect(model.stream(request(controller.signal)));

    setTimeout(() => controller.abort(), 20);

    expect(await running).toEqual([
      { type: "text-delta", text: "Let me" },
      { type: "stop", reason: "aborted" },
    ]);
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});
