import { t } from "elysia";

import type {
  ScriptedLanguageModel,
  ScriptStep,
} from "@/adapters/llm/scripted.language-model";
import { make } from "@/core/registry";
import { defineRoute } from "@/core/route";
import { LanguageModel, type MeasuredLanguageModel } from "@/platform/llm";

export const scriptModelRoute = () =>
  defineRoute({
    body: t.Object({ steps: t.Array(t.Unknown()) }),
    response: t.Object({ pending: t.Integer() }),
    summary: "Queue what the language model says on its next turn",

    action: ({ body }) => {
      const model = (make(LanguageModel) as MeasuredLanguageModel)
        .inner as ScriptedLanguageModel;

      model.enqueue(body.steps as ScriptStep[]);

      return Promise.resolve({ pending: model.pending() });
    },
  });
