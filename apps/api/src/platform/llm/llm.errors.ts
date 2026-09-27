import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class LanguageModelUnavailableError extends ModuleError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "LANGUAGE_MODEL_UNAVAILABLE";
}
