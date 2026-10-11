import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class UserAlreadyExistsError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "USER_ALREADY_EXISTS";
}

export class UserNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "NOT_FOUND";
}

export class EmailNotVerifiedError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "EMAIL_NOT_VERIFIED";
}

export class RoleRequiredError extends ModuleError {
  public readonly status = HttpStatus.Forbidden;
  public readonly code = "ROLE_REQUIRED";
}

export class OwnRoleChangeError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "OWN_ROLE_CHANGE";
}

export class AccountDeletionNotConfirmedError extends ModuleError {
  public readonly status = HttpStatus.BadRequest;
  public readonly code = "ACCOUNT_DELETION_NOT_CONFIRMED";
}

export class AccountDeletionUnauthorizedError extends ModuleError {
  public readonly status = HttpStatus.Unauthorized;
  public readonly code = "ACCOUNT_DELETION_UNAUTHORIZED";
}
