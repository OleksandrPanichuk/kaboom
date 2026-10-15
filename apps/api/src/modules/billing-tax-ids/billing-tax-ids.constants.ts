import { MINUTE } from "@/constants";

export const TAX_IDS_RATE_LIMIT = {
  limit: 20,
  windowMs: 15 * MINUTE,
} as const;
