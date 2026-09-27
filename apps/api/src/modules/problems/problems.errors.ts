import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class ProblemNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "PROBLEM_NOT_FOUND";
}
