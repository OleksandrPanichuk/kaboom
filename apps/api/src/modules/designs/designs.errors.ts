import type { OpRejection } from "@repo/design";

import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class DesignNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "DESIGN_NOT_FOUND";
}

export class DesignRevisionNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "DESIGN_REVISION_NOT_FOUND";
}

export class DesignLockedError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "DESIGN_LOCKED";
}

export class DesignRevisionConflictError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "DESIGN_REVISION_CONFLICT";

  constructor(revision: number) {
    super("The design changed since that revision", { revision });
  }
}

export class DesignOpRejectedError extends ModuleError {
  public readonly status = HttpStatus.UnprocessableEntity;
  public readonly code = "DESIGN_OP_REJECTED";

  constructor({ index, reason, message }: OpRejection) {
    super(message, { index, reason });
  }
}
