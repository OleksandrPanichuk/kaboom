import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class ProblemNotStartedError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "PROBLEM_NOT_STARTED";
}

export class HintNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "HINT_NOT_FOUND";
}

export class HintOutOfOrderError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "HINT_OUT_OF_ORDER";
}

export class SubmissionPendingChangesError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "SUBMISSION_REVISION_MISMATCH";
}
