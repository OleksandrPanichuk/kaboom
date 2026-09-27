import { MINUTE } from "@/constants";

export const SIMULATION_RUN_RATE_LIMIT = {
  limit: 60,
  windowMs: MINUTE,
  scope: "simulations:run",
} as const;
