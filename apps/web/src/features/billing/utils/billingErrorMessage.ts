import { ApiRequestError } from "@/lib/api";

const MESSAGES: Record<string, string> = {
  BILLING_UNAVAILABLE: "Payments are not set up here yet.",
  BILLING_ALREADY_PRO: "You already have Pro.",
  BILLING_OFFER_NOT_FOUND: "That plan is not on sale.",
  BILLING_ADDRESS_REQUIRED: "Add your billing address first.",
  BILLING_DETAILS_REJECTED:
    "The payment provider did not accept those details.",
  RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
};

export const billingErrorMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError) {
    if (error.code === "BILLING_DETAILS_REJECTED") return error.message;

    return (error.code && MESSAGES[error.code]) ?? error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong.";
};

export const billingErrorCode = (error: unknown): string | null =>
  error instanceof ApiRequestError ? error.code : null;
