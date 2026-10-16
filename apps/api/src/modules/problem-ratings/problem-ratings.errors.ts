import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class RatingNeedsSubmissionError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "RATING_NEEDS_SUBMISSION";
}

export class RatingOwnProblemError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "RATING_OWN_PROBLEM";
}
