import { ApiRequestError } from "@/lib/api";

export const CHALLENGE_REQUIRED_CODE = "CAPTCHA_CHALLENGE_REQUIRED";

export const isChallengeRequired = (error: unknown): boolean =>
  error instanceof ApiRequestError && error.code === CHALLENGE_REQUIRED_CODE;
