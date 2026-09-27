import type { InterviewPhase } from "@repo/design";
import z from "zod";

import type { LlmTool } from "@/platform/llm";

import type { InterviewEntity } from "../interview.entity";
import type { PinnedProblem } from "../interviews.service";

export interface ToolContext {
  interview: InterviewEntity;
  pinned: PinnedProblem;
  turnId: string;
  signal: AbortSignal;
}

export interface ToolOutcome {
  content: string;
  isError?: boolean;
  ends?: boolean;
}

export interface InterviewerTool<Input = unknown> {
  name: string;
  description: string;
  input: z.ZodType<Input>;
  phases: "all" | readonly InterviewPhase[];
  handle: (input: Input, context: ToolContext) => Promise<ToolOutcome>;
}

export const defineInterviewerTool = <Schema extends z.ZodType>(tool: {
  name: string;
  description: string;
  input: Schema;
  phases: "all" | readonly InterviewPhase[];
  handle: (
    input: z.output<Schema>,
    context: ToolContext,
  ) => Promise<ToolOutcome>;
}): InterviewerTool<z.output<Schema>> =>
  tool as unknown as InterviewerTool<z.output<Schema>>;

export const toLlmTool = (tool: InterviewerTool): LlmTool => {
  const { $schema: _schema, ...inputSchema } = z.toJSONSchema(tool.input) as {
    $schema?: string;
  } & Record<string, unknown>;

  return { name: tool.name, description: tool.description, inputSchema };
};
