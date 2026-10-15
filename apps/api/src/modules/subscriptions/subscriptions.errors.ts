import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class SubscriptionNotFoundAtProviderError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "SUBSCRIPTION_NOT_FOUND_AT_PROVIDER";
}

export class SubscriptionConflictError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "SUBSCRIPTION_CONFLICT";
}
