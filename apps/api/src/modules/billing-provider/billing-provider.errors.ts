import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class BillingUnavailableError extends ModuleError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "BILLING_UNAVAILABLE";
}

export class InvalidBillingWebhookError extends ModuleError {
  public readonly status = HttpStatus.BadRequest;
  public readonly code = "BILLING_WEBHOOK_INVALID";
}
