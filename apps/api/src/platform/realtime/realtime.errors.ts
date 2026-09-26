import { AppError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class RealtimeUnavailableError extends AppError {
  public readonly status = HttpStatus.ServiceUnavailable;
  public readonly code = "REALTIME_UNAVAILABLE";

  constructor() {
    super("Live updates are unavailable; retry shortly");
  }
}
