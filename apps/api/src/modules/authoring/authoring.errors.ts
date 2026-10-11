import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class DraftNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "DRAFT_NOT_FOUND";
}

export class DraftLimitError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "DRAFT_LIMIT";
}

export class DraftTooLargeError extends ModuleError {
  public readonly status = HttpStatus.UnprocessableEntity;
  public readonly code = "DRAFT_TOO_LARGE";
}

export class ProblemNotPublishableError extends ModuleError {
  public readonly status = HttpStatus.UnprocessableEntity;
  public readonly code = "PROBLEM_NOT_PUBLISHABLE";
}

export class SlugTakenError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "SLUG_TAKEN";
}

export class SlugChangedError extends ModuleError {
  public readonly status = HttpStatus.UnprocessableEntity;
  public readonly code = "SLUG_CHANGED";
}

export class NothingToReviewError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "NOTHING_TO_REVIEW";
}

export class ReviewPendingError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "REVIEW_PENDING";
}

export class ReviewNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "REVIEW_NOT_FOUND";
}

export class ReviewDecidedError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "REVIEW_DECIDED";
}

export class OwnProblemReviewError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "OWN_PROBLEM_REVIEW";
}
