import Anthropic from "@anthropic-ai/sdk";

import {
  LanguageModel,
  type LlmEvent,
  type LlmRequest,
  type LlmRole,
} from "@/platform/llm/ports/language-model";

import {
  toMessages,
  toStopReason,
  toSystem,
  toTools,
} from "./anthropic.helpers";

type RawEvent = Anthropic.RawMessageStreamEvent;

export interface AnthropicClient {
  create(
    body: Anthropic.MessageCreateParamsStreaming,
    options: { signal: AbortSignal },
  ): Promise<AsyncIterable<RawEvent>>;
}

export interface AnthropicLanguageModelOptions {
  models: Record<LlmRole, string>;
  client: AnthropicClient;
}

export const anthropicClient = (apiKey: string): AnthropicClient => {
  const sdk = new Anthropic({ apiKey, maxRetries: 2 });

  return {
    create: (body, options) => sdk.messages.create(body, options),
  };
};

interface OpenTool {
  id: string;
  name: string;
  json: string;
}

export class AnthropicLanguageModel extends LanguageModel {
  constructor(private readonly options: AnthropicLanguageModelOptions) {
    super();
  }

  public async *stream(request: LlmRequest): AsyncIterable<LlmEvent> {
    const tools = new Map<number, OpenTool>();
    let stopReason: string | null = null;
    let usage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };

    try {
      const events = await this.options.client.create(
        {
          model: this.options.models[request.role],
          max_tokens: request.maxOutputTokens,
          system: toSystem(request.system),
          messages: toMessages(request.messages),
          ...(request.tools.length > 0
            ? { tools: toTools(request.tools) }
            : {}),
          metadata: { user_id: request.userId },
          stream: true,
        },
        { signal: request.signal },
      );

      for await (const event of events) {
        switch (event.type) {
          case "message_start": {
            const start = event.message.usage;

            usage = {
              inputTokens: start.input_tokens,
              outputTokens: start.output_tokens,
              cacheReadTokens: start.cache_read_input_tokens ?? 0,
              cacheWriteTokens: start.cache_creation_input_tokens ?? 0,
            };
            break;
          }
          case "content_block_start":
            if (event.content_block.type === "tool_use") {
              tools.set(event.index, {
                id: event.content_block.id,
                name: event.content_block.name,
                json: "",
              });
            }
            break;
          case "content_block_delta":
            if (event.delta.type === "text_delta") {
              yield { type: "text-delta", text: event.delta.text };
            } else if (event.delta.type === "input_json_delta") {
              const open = tools.get(event.index);

              if (open) open.json += event.delta.partial_json;
            }
            break;
          case "content_block_stop": {
            const open = tools.get(event.index);

            if (open) {
              tools.delete(event.index);
              yield {
                type: "tool-use",
                id: open.id,
                name: open.name,
                input: open.json ? (JSON.parse(open.json) as unknown) : {},
              };
            }
            break;
          }
          case "message_delta":
            stopReason = event.delta.stop_reason ?? stopReason;
            usage = {
              inputTokens: event.usage.input_tokens ?? usage.inputTokens,
              outputTokens: event.usage.output_tokens,
              cacheReadTokens:
                event.usage.cache_read_input_tokens ?? usage.cacheReadTokens,
              cacheWriteTokens:
                event.usage.cache_creation_input_tokens ??
                usage.cacheWriteTokens,
            };
            break;
          default:
            break;
        }
      }
    } catch (error) {
      if (
        request.signal.aborted ||
        error instanceof Anthropic.APIUserAbortError
      ) {
        yield { type: "usage", usage };
        yield { type: "stop", reason: "aborted" };

        return;
      }

      throw error;
    }

    yield { type: "usage", usage };
    yield {
      type: "stop",
      reason: request.signal.aborted ? "aborted" : toStopReason(stopReason),
    };
  }
}
