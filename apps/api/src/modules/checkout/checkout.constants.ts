import { MINUTE } from "@/constants";

export const CHECKOUT_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * MINUTE,
} as const;
