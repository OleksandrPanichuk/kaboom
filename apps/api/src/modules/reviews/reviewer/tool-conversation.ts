import z from "zod";

import { make } from "@/core/registry";
import {
  LanguageModel,
  type LlmMessage,
  type LlmTool,
  tokensOf,
  UsageLedger,
} from "@/platform/llm";

import { REVIEW_MAX_OUTPUT_TOKENS } from "../reviews.constants";

export interface ToolAnswer {
  toolUseId: string | null;
  input: unknown;
}

export const reviewTool = (
  name: string,
  description: string,
  schema: z.ZodType,
): LlmTool => {
  const { $schema: _schema, ...inputSchema } = z.toJSONSchema(schema) as {
    $schema?: string;
  } & Record<string, unknown>;

  return { name, description, inputSchema };
};

export class ToolConversation {
  public tokens = 0;

  private readonly messages: LlmMessage[];

  constructor(
    private readonly options: {
      system: string;
      tool: LlmTool;
      userId: string;
    },
    record: string,
  ) {
    this.messages = [
      { role: "user", content: [{ type: "text", text: record }] },
    ];
  }

  public get request(): LlmMessage[] {
    return this.messages;
  }

  public async ask(): Promise<ToolAnswer> {
    const { system, tool, userId } = this.options;
    let answer: ToolAnswer = { toolUseId: null, input: null };

    for await (const event of make(LanguageModel).stream({
      role: "review",
      system: [{ text: system, cache: true }],
      messages: this.messages,
      tools: [tool],
      maxOutputTokens: REVIEW_MAX_OUTPUT_TOKENS,
      userId,
      signal: new AbortController().signal,
    })) {
      if (event.type === "tool-use" && event.name === tool.name) {
        answer = { toolUseId: event.id, input: event.input };
      } else if (event.type === "usage") {
        this.tokens += tokensOf(event.usage);
        await make(UsageLedger).record(userId, event.usage);
      }
    }

    return answer;
  }

  public reject(answer: ToolAnswer, problem: string): void {
    if (!answer.toolUseId) {
      this.messages.push(
        { role: "assistant", content: [{ type: "text", text: "(no answer)" }] },
        { role: "user", content: [{ type: "text", text: problem }] },
      );

      return;
    }

    this.messages.push(
      {
        role: "assistant",
        content: [
          {
            type: "tool-use",
            id: answer.toolUseId,
            name: this.options.tool.name,
            input: answer.input,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool-result",
            toolUseId: answer.toolUseId,
            content: problem,
            isError: true,
          },
        ],
      },
    );
  }
}
