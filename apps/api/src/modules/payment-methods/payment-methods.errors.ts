import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class CardNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "BILLING_CARD_NOT_FOUND";
}

export class CardInUseError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "BILLING_CARD_IN_USE";
}
