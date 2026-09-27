import type { LlmUsage } from "./ports";

export const CACHE_READ_WEIGHT = 0.1;

export const tokensOf = (usage: LlmUsage): number =>
  Math.ceil(
    usage.inputTokens +
      usage.outputTokens +
      usage.cacheWriteTokens +
      usage.cacheReadTokens * CACHE_READ_WEIGHT,
  );

export const dayOf = (at: Date): string => at.toISOString().slice(0, 10);
