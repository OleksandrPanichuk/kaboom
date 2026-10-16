import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class ProblemCommentNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "PROBLEM_COMMENT_NOT_FOUND";
}

export class CommentNotYoursError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "COMMENT_NOT_YOURS";
}

export class CommentRemovedError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "COMMENT_REMOVED";
}

export class CommentThreadFullError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "COMMENT_THREAD_FULL";
}
