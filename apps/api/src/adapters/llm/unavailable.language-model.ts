import { LanguageModelUnavailableError } from "@/platform/llm/llm.errors";
import {
  LanguageModel,
  type LlmEvent,
} from "@/platform/llm/ports/language-model";

export class UnavailableLanguageModel extends LanguageModel {
  public stream(): AsyncIterable<LlmEvent> {
    throw new LanguageModelUnavailableError(
      "No language model is configured: set ANTHROPIC_API_KEY",
    );
  }
}
