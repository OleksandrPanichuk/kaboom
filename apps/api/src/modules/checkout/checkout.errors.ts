import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class AlreadyProError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "BILLING_ALREADY_PRO";
}

export class BillingAddressRequiredError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "BILLING_ADDRESS_REQUIRED";
}
