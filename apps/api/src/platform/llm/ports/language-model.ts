import { Port } from "@/core/port";

export type LlmRole = "interviewer" | "review";

export interface SystemBlock {
  text: string;
  cache?: boolean;
}

export type LlmContent =
  | { type: "text"; text: string }
  | { type: "tool-use"; id: string; name: string; input: unknown }
  | {
      type: "tool-result";
      toolUseId: string;
      content: string;
      isError?: boolean;
    };

export interface LlmMessage {
  role: "user" | "assistant";
  content: LlmContent[];
}

export interface LlmTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type LlmStopReason = "end" | "tool-use" | "max-tokens" | "aborted";

export type LlmEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-use"; id: string; name: string; input: unknown }
  | { type: "usage"; usage: LlmUsage }
  | { type: "stop"; reason: LlmStopReason };

export interface LlmRequest {
  role: LlmRole;
  system: SystemBlock[];
  messages: LlmMessage[];
  tools: LlmTool[];
  maxOutputTokens: number;
  userId: string;
  signal: AbortSignal;
}

export abstract class LanguageModel extends Port {
  public abstract stream(request: LlmRequest): AsyncIterable<LlmEvent>;

  public verify(): Promise<void> {
    return Promise.resolve();
  }
}
