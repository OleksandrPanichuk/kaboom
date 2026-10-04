import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class DesignTestsTimedOutError extends ModuleError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "DESIGN_TESTS_TIMED_OUT";
}

export class DesignTestsUnavailableError extends ModuleError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "DESIGN_TESTS_UNAVAILABLE";
}
