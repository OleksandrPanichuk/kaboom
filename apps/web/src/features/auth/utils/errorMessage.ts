import { ApiRequestError } from "@/lib/api";

const MESSAGES: Readonly<Record<string, string>> = {
  INVALID_CREDENTIALS: "That email and password do not match.",
  USER_ALREADY_EXISTS: "An account with that email already exists.",
  RATE_LIMIT_EXCEEDED: "Too many attempts. Wait a minute and try again.",
  CAPTCHA_REQUIRED: "Complete the captcha to continue.",
  CAPTCHA_FAILED: "The captcha check failed. Try again.",
  CAPTCHA_CHALLENGE_REQUIRED: "The captcha needs one more check. Try again.",
  INVALID_TOKEN: "This link is not valid. Ask for a new one.",
  TOKEN_EXPIRED: "This link has expired. Ask for a new one.",
  PASSWORD_NOT_SET:
    "This account signs in with Google or GitHub and has no password yet.",
};

export const errorMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!;

    if (error.status === 422) return "Check the highlighted fields.";

    return error.message;
  }

  return "Something went wrong. Try again.";
};
