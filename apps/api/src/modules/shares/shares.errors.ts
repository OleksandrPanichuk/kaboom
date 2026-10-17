import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class ShareNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "SHARE_NOT_FOUND";
}

export class ShareNeedsReviewError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "SHARE_NEEDS_REVIEW";
}
