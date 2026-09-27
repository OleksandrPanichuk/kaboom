import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "bun:test";

import type { LlmEvent, LlmRequest } from "@/platform/llm/ports/language-model";

import {
  type AnthropicClient,
  AnthropicLanguageModel,
} from "./anthropic.language-model";

type RawEvent = Anthropic.RawMessageStreamEvent;

const usage = (input: number, output: number) =>
  ({
    input_tokens: input,
    output_tokens: output,
    cache_read_input_tokens: 900,
    cache_creation_input_tokens: 100,
  }) as Anthropic.Usage;

const RECORDED: RawEvent[] = [
  {
    type: "message_start",
    message: { usage: usage(1_200, 1) } as Anthropic.Message,
  },
  {
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "", citations: null },
  },
  {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: "Let me " },
  },
  {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: "point at it." },
  },
  { type: "content_block_stop", index: 0 },
  {
    type: "content_block_start",
    index: 1,
    content_block: {
      type: "tool_use",
      id: "toolu_1",
      name: "highlight",
      input: {},
    } as Anthropic.ToolUseBlock,
  },
  {
    type: "content_block_delta",
    index: 1,
    delta: { type: "input_json_delta", partial_json: '{"nodeIds":["u' },
  },
  {
    type: "content_block_delta",
    index: 1,
    delta: { type: "input_json_delta", partial_json: 'sers"]}' },
  },
  { type: "content_block_stop", index: 1 },
  {
    type: "message_delta",
    delta: { stop_reason: "tool_use", stop_sequence: null },
    usage: { output_tokens: 42 } as Anthropic.MessageDeltaUsage,
  } as RawEvent,
  { type: "message_stop" },
];

const fake = (events: RawEvent[], gate?: Promise<void>) => {
  const calls: Array<{
    body: Anthropic.MessageCreateParamsStreaming;
    signal: AbortSignal;
  }> = [];
  const client: AnthropicClient = {
    create: (body, { signal }) => {
      calls.push({ body, signal });

      return Promise.resolve(
        (async function* () {
          for (const [index, event] of events.entries()) {
            if (gate && index === 3) await gate;
            if (signal.aborted) throw new Anthropic.APIUserAbortError();
            yield event;
          }
        })(),
      );
    },
  };

  return { client, calls };
};

const request = (signal = new AbortController().signal): LlmRequest => ({
  role: "interviewer",
  system: [
    { text: "persona", cache: true },
    { text: "problem", cache: true },
    { text: "state" },
  ],
  messages: [
    { role: "user", content: [{ type: "text", text: "Hi" }] },
    {
      role: "assistant",
      content: [
        { type: "tool-use", id: "toolu_0", name: "read_design", input: {} },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "tool-result",
          toolUseId: "toolu_0",
          content: "Revision 0.",
          isError: true,
        },
      ],
    },
  ],
  tools: [
    {
      name: "highlight",
      description: "Point at nodes",
      inputSchema: {
        type: "object",
        properties: { nodeIds: { type: "array" } },
        required: ["nodeIds"],
      },
    },
  ],
  maxOutputTokens: 1_024,
  userId: "user-1",
  signal,
});

const collect = async (events: AsyncIterable<LlmEvent>) => {
  const seen: LlmEvent[] = [];

  for await (const event of events) seen.push(event);

  return seen;
};

const models = { interviewer: "claude-sonnet-5", review: "claude-opus-5-5" };

describe("AnthropicLanguageModel", () => {
  test("turns the raw stream into deltas, whole tool calls, usage and a stop", async () => {
    const { client } = fake(RECORDED);
    const model = new AnthropicLanguageModel({ client, models });

    expect(await collect(model.stream(request()))).toEqual([
      { type: "text-delta", text: "Let me " },
      { type: "text-delta", text: "point at it." },
      {
        type: "tool-use",
        id: "toolu_1",
        name: "highlight",
        input: { nodeIds: ["users"] },
      },
      {
        type: "usage",
        usage: {
          inputTokens: 1_200,
          outputTokens: 42,
          cacheReadTokens: 900,
          cacheWriteTokens: 100,
        },
      },
      { type: "stop", reason: "tool-use" },
    ]);
  });

  test("sends the role's model, cache marks on the cached blocks, tools and tool results", async () => {
    const { client, calls } = fake(RECORDED);

    await collect(
      new AnthropicLanguageModel({ client, models }).stream(request()),
    );

    const { body } = calls[0]!;

    expect(body.model).toBe("claude-sonnet-5");
    expect(body.max_tokens).toBe(1_024);
    expect(body.stream).toBe(true);
    expect(body.metadata).toEqual({ user_id: "user-1" });
    expect(body.system).toEqual([
      { type: "text", text: "persona", cache_control: { type: "ephemeral" } },
      { type: "text", text: "problem", cache_control: { type: "ephemeral" } },
      { type: "text", text: "state" },
    ]);
    expect(body.tools).toEqual([
      {
        name: "highlight",
        description: "Point at nodes",
        input_schema: {
          type: "object",
          properties: { nodeIds: { type: "array" } },
          required: ["nodeIds"],
        },
      },
    ]);
    expect(body.messages[1]!.content).toEqual([
      { type: "tool_use", id: "toolu_0", name: "read_design", input: {} },
    ]);
    expect(body.messages[2]!.content).toEqual([
      {
        type: "tool_result",
        tool_use_id: "toolu_0",
        content: "Revision 0.",
        is_error: true,
      },
    ]);
  });

  test("stops with aborted when the request's signal fires mid-stream", async () => {
    let open: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const { client } = fake(RECORDED, gate);
    const controller = new AbortController();
    const running = collect(
      new AnthropicLanguageModel({ client, models }).stream(
        request(controller.signal),
      ),
    );

    controller.abort();
    open();

    const seen = await running;

    expect(seen.map((event) => event.type)).toEqual(["usage", "stop"]);
    expect(seen.at(-1)).toEqual({ type: "stop", reason: "aborted" });
  });
});
