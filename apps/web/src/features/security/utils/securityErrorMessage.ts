import { errorMessage } from "@/features/auth";
import { ApiRequestError } from "@/lib/api";

const MESSAGES: Readonly<Record<string, string>> = {
  LAST_AUTH_METHOD:
    "This is your only way to sign in. Add a password or connect another provider first.",
  PASSWORD_ALREADY_SET: "This account already has a password.",
  EMAIL_ALREADY_IN_USE: "Another account already uses that email.",
  ACCOUNT_DELETION_NOT_CONFIRMED:
    "Type your account's email exactly to confirm.",
  ACCOUNT_DELETION_UNAUTHORIZED: "That password is not right.",
  OAUTH_PROVIDER_NOT_LINKED: "That provider is not connected.",
  SESSION_NOT_FOUND: "That session has already ended.",
};

export const securityErrorMessage = (
  error: unknown,
  overrides: Readonly<Record<string, string>> = {},
): string => {
  if (error instanceof ApiRequestError && error.code) {
    const message = overrides[error.code] ?? MESSAGES[error.code];

    if (message) return message;
  }

  return errorMessage(error);
};
