import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class PurchaseConflictError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "PURCHASE_CONFLICT";
}
