import {
  anthropicClient,
  AnthropicLanguageModel,
} from "@/adapters/llm/anthropic";
import { MemoryUsageLedger } from "@/adapters/llm/memory.usage-ledger";
import { PostgresUsageLedger } from "@/adapters/llm/postgres.usage-ledger";
import { ScriptedLanguageModel } from "@/adapters/llm/scripted.language-model";
import { UnavailableLanguageModel } from "@/adapters/llm/unavailable.language-model";
import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { LanguageModel, UsageLedger } from "./ports";

export const llmModule = defineModule({
  name: "llm",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const model = new ScriptedLanguageModel();
      const ledger = new MemoryUsageLedger(env.LLM_DAILY_TOKEN_BUDGET);

      bind(LanguageModel, () => model);
      bind(UsageLedger, () => ledger);

      return { model };
    }

    const model: LanguageModel = env.ANTHROPIC_API_KEY
      ? new AnthropicLanguageModel({
          client: anthropicClient(env.ANTHROPIC_API_KEY),
          models: {
            interviewer: env.LLM_INTERVIEWER_MODEL,
            review: env.LLM_REVIEW_MODEL,
          },
        })
      : new UnavailableLanguageModel();

    bind(LanguageModel, () => model);
    bind(
      UsageLedger,
      () => new PostgresUsageLedger(env.LLM_DAILY_TOKEN_BUDGET),
    );

    return { model };
  },

  start: ({ state }) => state.model.verify(),
});
