import { DAY, HOUR, MINUTE } from "@/constants";

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

export const INTERVIEW_TRIGGER_RATE_LIMIT = {
  limit: 30,
  windowMs: MINUTE,
  scope: "interviews:trigger",
} as const;

export const PHASE_TICK_MS = 30_000;

export const MESSAGE_MAX_LENGTH = 4_000;

export const interviewChannel = (id: string) => `interviews:${id}`;

export const INTERVIEWS_QUEUE = "interviews";

export const InterviewQueueJobs = {
  ExpireStale: "interviews.expire-stale",
} as const;

export const EXPIRE_STALE_INTERVIEWS_PATTERN = "15 * * * *";

export const INTERVIEW_IDLE_MS = DAY;
