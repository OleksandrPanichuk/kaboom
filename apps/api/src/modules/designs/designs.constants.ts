import { MINUTE } from "@/constants";

export const DESIGN_OPS_RATE_LIMIT = {
  limit: 600,
  windowMs: MINUTE,
  scope: "designs:ops",
} as const;
