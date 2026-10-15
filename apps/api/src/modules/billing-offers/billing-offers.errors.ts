import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class BillingPriceMisconfiguredError extends ModuleError {
  public readonly status = HttpStatus.InternalServerError;
  public readonly code = "BILLING_PRICE_MISCONFIGURED";
}

export class BillingOfferNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "BILLING_OFFER_NOT_FOUND";
}
