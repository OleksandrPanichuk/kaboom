import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class ReviewNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "REVIEW_NOT_FOUND";
}

export class ReviewNotFailedError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "REVIEW_NOT_FAILED";
}

export class ReviewModelError extends ModuleError {
  public readonly status = HttpStatus.BadGateway;
  public readonly code = "REVIEW_MODEL_FAILED";
}
