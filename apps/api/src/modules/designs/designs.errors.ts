import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class DesignNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "DESIGN_NOT_FOUND";
}
