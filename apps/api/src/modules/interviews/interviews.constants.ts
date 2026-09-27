import { HOUR, MINUTE } from "@/constants";

export const START_INTERVIEW_RATE_LIMIT = {
  limit: 10,
  windowMs: HOUR,
  scope: "interviews:start",
} as const;

export const INTERVIEW_MESSAGE_RATE_LIMIT = {
  limit: 30,
  windowMs: MINUTE,
  scope: "interviews:message",
} as const;

export const INTERVIEW_OPS_RATE_LIMIT = {
  limit: 120,
  windowMs: MINUTE,
  scope: "interviews:ops",
} as const;

export const INTERVIEW_SIMULATION_RATE_LIMIT = {
  limit: 20,
  windowMs: MINUTE,
  scope: "interviews:simulation",
} as const;

export const MESSAGE_MAX_LENGTH = 4_000;

export const interviewChannel = (id: string) => `interviews:${id}`;
