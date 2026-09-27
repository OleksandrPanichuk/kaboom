import { AppError } from "@/core/errors";
import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { DesignsService } from "@/modules/designs";
import {
  LanguageModel,
  type LlmContent,
  type LlmMessage,
  tokensOf,
  UsageLedger,
} from "@/platform/llm";

import type { InterviewEntity } from "../interview.entity";
import { InterviewsService } from "../interviews.service";
import { InterviewMessagesRepository, InterviewsRepository } from "../ports";
import { historyMessages, stateBlock, systemBlocks } from "./context";
import {
  type InterviewerTool,
  toLlmTool,
  type ToolOutcome,
} from "./define-tool";
import { publishLive } from "./live";
import { toolsFor } from "./tools";
import type { Trigger } from "./triggers";

const MAX_ROUNDS = 6;
const MAX_OUTPUT_TOKENS = 1_024;

export interface TurnRequest {
  interview: InterviewEntity;
  triggers: Trigger[];
  turnId: string;
  signal: AbortSignal;
}

export interface TurnResult {
  status: "done" | "interrupted";
  tokens: number;
}

interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export class InterviewerRunner extends Service {
  private readonly interviews = makeService(InterviewsService);

  private readonly designs = makeService(DesignsService);

  private readonly messages = makeRepository(InterviewMessagesRepository);

  private readonly rows = makeRepository(InterviewsRepository);

  public async run({
    interview: started,
    triggers,
    turnId,
    signal,
  }: TurnRequest): Promise<TurnResult> {
    const model = make(LanguageModel);
    const ledger = make(UsageLedger);
    const pinned = await this.interviews.pinned(started);
    const conversation: LlmMessage[] = historyMessages(
      await this.messages.listFor(started.id),
      triggers,
    );
    const said: string[] = [];
    const startedAt = new Date();
    let interview = started;
    let tokens = 0;

    const finish = async (status: TurnResult["status"]) => {
      const body = said.join("\n\n").trim();

      if (body) {
        await this.interviews.commit(interview.id, async (emit) => {
          const message = await this.messages.insert({
            interviewId: interview.id,
            author: "interviewer",
            body,
            turnId,
            interrupted: status === "interrupted",
            createdAt: startedAt,
          });

          await emit("message", { messageId: message.id, turnId });
        });
      }

      return { status, tokens };
    };

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const design = await this.designs.getOwned(
        interview.designId,
        interview.ownerId,
      );
      const tools = toolsFor(interview.phase);
      const calls: ToolCall[] = [];
      let text = "";

      for await (const event of model.stream({
        role: "interviewer",
        system: systemBlocks(
          pinned,
          stateBlock(
            interview,
            pinned,
            design.graph,
            design.revision,
            new Date(),
          ),
        ),
        messages: conversation,
        tools: tools.map(toLlmTool),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        userId: interview.ownerId,
        signal,
      })) {
        if (event.type === "text-delta") {
          text += event.text;
          await publishLive(interview.id, {
            type: "message-delta",
            turnId,
            text: event.text,
          });
        } else if (event.type === "tool-use") {
          calls.push(event);
        } else if (event.type === "usage") {
          tokens += tokensOf(event.usage);
          await ledger.record(interview.ownerId, event.usage);
        }
      }

      if (text.trim()) said.push(text.trim());

      if (signal.aborted) return finish("interrupted");

      if (calls.length === 0) return finish("done");

      const results: LlmContent[] = [];
      let ends = false;

      for (const call of calls) {
        if (signal.aborted) return finish("interrupted");

        const outcome = await this.call(
          tools,
          call,
          interview,
          pinned,
          turnId,
          signal,
        );

        ends ||= outcome.ends === true;
        results.push({
          type: "tool-result",
          toolUseId: call.id,
          content: outcome.content,
          ...(outcome.isError ? { isError: true } : {}),
        });
      }

      conversation.push(
        {
          role: "assistant",
          content: [
            ...(text.trim() ? [{ type: "text" as const, text }] : []),
            ...calls.map((call) => ({ type: "tool-use" as const, ...call })),
          ],
        },
        { role: "user", content: results },
      );

      if (ends) return finish("done");

      interview = (await this.rows.findById(interview.id)) ?? interview;

      if (interview.status !== "active") return finish("done");
    }

    return finish("done");
  }

  private async call(
    tools: InterviewerTool[],
    call: ToolCall,
    interview: InterviewEntity,
    pinned: Awaited<ReturnType<InterviewsService["pinned"]>>,
    turnId: string,
    signal: AbortSignal,
  ): Promise<ToolOutcome> {
    const tool = tools.find((item) => item.name === call.name);

    if (!tool) {
      return {
        content: `${call.name} is not available in the ${interview.phase} phase.`,
        isError: true,
      };
    }

    const input = tool.input.safeParse(call.input ?? {});

    if (!input.success) {
      return {
        content: `The input for ${call.name} is not valid: ${input.error.message}`,
        isError: true,
      };
    }

    try {
      return await tool.handle(input.data, {
        interview,
        pinned,
        turnId,
        signal,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return { content: error.message, isError: true };
      }

      throw error;
    }
  }
}
