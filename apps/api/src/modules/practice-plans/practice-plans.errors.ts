import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class PracticePlanNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "PRACTICE_PLAN_NOT_FOUND";
}

export class NothingToPracticeError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "NOTHING_TO_PRACTICE";
}
