import { make } from "@/core/registry";
import { Metrics } from "@/platform/metrics";

import { LanguageModelUnavailableError } from "./llm.errors";
import {
  LanguageModel,
  type LlmEvent,
  type LlmRequest,
  type LlmStopReason,
  type LlmUsage,
} from "./ports";

const TOKEN_TYPES: ReadonlyArray<[keyof LlmUsage, string]> = [
  ["inputTokens", "input"],
  ["outputTokens", "output"],
  ["cacheReadTokens", "cache_read"],
  ["cacheWriteTokens", "cache_write"],
];

export class MeasuredLanguageModel extends LanguageModel {
  constructor(public readonly inner: LanguageModel) {
    super();
  }

  public verify(): Promise<void> {
    return this.inner.verify();
  }

  public async *stream(request: LlmRequest): AsyncIterable<LlmEvent> {
    const metrics = make(Metrics);
    const { role } = request;
    const startedAt = performance.now();
    let answered = false;
    let failed = false;
    let stopped: LlmStopReason | "none" = "none";

    try {
      for await (const event of this.inner.stream(request)) {
        if (
          !answered &&
          (event.type === "text-delta" || event.type === "tool-use")
        ) {
          answered = true;
          metrics.observe("llmFirstToken", performance.now() - startedAt, {
            role,
          });
        }

        if (event.type === "usage") {
          for (const [field, type] of TOKEN_TYPES) {
            if (event.usage[field] > 0) {
              metrics.count("llmTokens", event.usage[field], { role, type });
            }
          }
        }

        if (event.type === "stop") stopped = event.reason;

        yield event;
      }
    } catch (error) {
      failed = true;
      metrics.count("llmFailures", 1, {
        role,
        reason:
          error instanceof LanguageModelUnavailableError
            ? "unavailable"
            : "error",
      });

      throw error;
    } finally {
      if (!failed) {
        metrics.count("llmTurns", 1, { role, stop_reason: stopped });
        metrics.observe("llmTurnDuration", performance.now() - startedAt, {
          role,
        });
      }
    }
  }
}
