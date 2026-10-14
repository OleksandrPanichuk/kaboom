import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class BillingUnavailableError extends ModuleError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "BILLING_UNAVAILABLE";
}

export class BillingPriceMisconfiguredError extends ModuleError {
  public readonly status = HttpStatus.InternalServerError;
  public readonly code = "BILLING_PRICE_MISCONFIGURED";
}
