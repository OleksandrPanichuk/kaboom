import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class PlanLimitError extends ModuleError {
  public readonly status = HttpStatus.PaymentRequired;
  public readonly code = "PLAN_LIMIT";
}
