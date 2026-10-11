import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class HandleTakenError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "HANDLE_TAKEN";
}

export class ProfileNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "PROFILE_NOT_FOUND";
}

export class AvatarNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "AVATAR_NOT_FOUND";
}

export class AvatarInvalidError extends ModuleError {
  public readonly status = HttpStatus.UnprocessableEntity;
  public readonly code = "AVATAR_INVALID";
}
