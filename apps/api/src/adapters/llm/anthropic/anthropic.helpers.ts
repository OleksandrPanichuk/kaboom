import type Anthropic from "@anthropic-ai/sdk";

import type {
  LlmMessage,
  LlmStopReason,
  LlmTool,
  SystemBlock,
} from "@/platform/llm/ports/language-model";

export const toSystem = (blocks: SystemBlock[]): Anthropic.TextBlockParam[] =>
  blocks.map((block) => ({
    type: "text",
    text: block.text,
    ...(block.cache ? { cache_control: { type: "ephemeral" } } : {}),
  }));

export const toMessages = (messages: LlmMessage[]): Anthropic.MessageParam[] =>
  messages.map((message) => ({
    role: message.role,
    content: message.content.map((part): Anthropic.ContentBlockParam =>
      part.type === "text"
        ? { type: "text", text: part.text }
        : part.type === "tool-use"
          ? {
              type: "tool_use",
              id: part.id,
              name: part.name,
              input: part.input ?? {},
            }
          : {
              type: "tool_result",
              tool_use_id: part.toolUseId,
              content: part.content,
              ...(part.isError ? { is_error: true } : {}),
            },
    ),
  }));

export const toTools = (tools: LlmTool[]): Anthropic.Tool[] =>
  tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object",
      ...tool.inputSchema,
    },
  }));

export const toStopReason = (
  reason: string | null | undefined,
): LlmStopReason =>
  reason === "tool_use"
    ? "tool-use"
    : reason === "max_tokens"
      ? "max-tokens"
      : "end";
