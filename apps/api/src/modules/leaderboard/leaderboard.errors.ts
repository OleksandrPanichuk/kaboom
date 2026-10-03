import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class HandleTakenError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "HANDLE_TAKEN";
}
