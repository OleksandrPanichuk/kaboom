import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class BillingTaxIdNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "BILLING_TAX_ID_NOT_FOUND";
}
