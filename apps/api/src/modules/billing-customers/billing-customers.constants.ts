import { MINUTE } from "@/constants";

export const BILLING_DETAILS_RATE_LIMIT = {
  limit: 20,
  windowMs: 15 * MINUTE,
} as const;
